import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { BadRequestException } from '@danet/core';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { createMockLogger, createMockSecret } from '@scope/common/testing';
import { PushService } from './push.service.ts';
import type {
  PushInstallationDocument,
  PushRepository,
} from './push.repository.ts';
import type { PushDeliveryAttemptRepository } from './push-delivery-attempt.repository.ts';
import type { PushRetryService } from './push-retry.service.ts';
import type { PushSenderService } from '@scope/service/push-sender';
import type { SecretService } from '@scope/secret';
import {
  PushChallengeExpiredError,
  PushChallengeInvalidError,
  PushInstallationNotFoundError,
} from './push.errors.ts';
import type { PushDelete, PushPreferences, PushProfile } from './push.types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(
  overrides?: Partial<PushInstallationDocument>,
): PushInstallationDocument {
  const now = Math.floor(Date.now() / 1000);
  return {
    installationId: 'inst-1',
    instance: 'default',
    endpoint: 'https://push.test/fcm/endpoint',
    keys: { p256dh: 'p256dh-test-key', auth: 'auth-test-key' },
    status: 'PENDING',
    platform: 'ANDROID',
    failureCount: 0,
    createdAt: now - 3600,
    updatedAt: now,
    ...overrides,
  };
}

function createService(
  deps: {
    repository?: Partial<PushRepository>;
    deliveryRepo?: Partial<PushDeliveryAttemptRepository>;
    pushSender?: Partial<PushSenderService>;
    retry?: Partial<PushRetryService>;
    secret?: SecretService;
  } = {},
): PushService {
  const { logger } = createMockLogger();
  const secret = deps.secret ?? createMockSecret({ DENO_ENV: 'test' }).service;
  return new PushService(
    (deps.repository ?? {}) as PushRepository,
    (deps.deliveryRepo ?? {
      insert: async () => {},
      findByInstallation: async () => [],
    }) as PushDeliveryAttemptRepository,
    (deps.pushSender ?? {}) as PushSenderService,
    (deps.retry ?? { enqueue: async () => {} }) as PushRetryService,
    logger,
    secret,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PushService', () => {
  // -- Constructor ----------------------------------------------------------

  it('constructs without errors', () => {
    const service = createService();
    assertEquals(typeof service.getApplicationServerKey, 'function');
  });

  // -- getApplicationServerKey ----------------------------------------------

  it('delegates getApplicationServerKey to pushSender', async () => {
    const getKeySpy = spy(async () => 'vapid-key-test');
    const pushSender = {
      getApplicationServerKey: getKeySpy,
    } as unknown as PushSenderService;
    const service = createService({ pushSender });

    const result = await service.getApplicationServerKey();

    assertEquals(result, 'vapid-key-test');
    assertSpyCalls(getKeySpy as never, 1);
  });

  // -- confirmInstallation (error paths only) --------------------------------

  it(
    'confirmInstallation throws PushInstallationNotFoundError when installation not found',
    async () => {
      const repository = {
        findById: spy(async () => null),
      } as unknown as PushRepository;
      const service = createService({ repository });

      await assertRejects(
        () =>
          service.confirmInstallation('inst-1', {
            instance: 'default',
            token: 'test-token',
          }),
        PushInstallationNotFoundError,
      );
    },
  );

  it(
    'confirmInstallation throws BadRequestException when installation is not pending',
    async () => {
      const doc = makeDoc({ status: 'ACTIVE' });
      const repository = {
        findById: spy(async () => doc),
      } as unknown as PushRepository;
      const service = createService({ repository });

      await assertRejects(
        () =>
          service.confirmInstallation('inst-1', {
            instance: 'default',
            token: 'test-token',
          }),
        BadRequestException,
      );
    },
  );

  it(
    'confirmInstallation throws PushChallengeInvalidError when challenge is missing',
    async () => {
      const doc = makeDoc({ status: 'PENDING', challenge: undefined });
      const repository = {
        findById: spy(async () => doc),
      } as unknown as PushRepository;
      const service = createService({ repository });

      await assertRejects(
        () =>
          service.confirmInstallation('inst-1', {
            instance: 'default',
            token: 'test-token',
          }),
        PushChallengeInvalidError,
      );
    },
  );

  it(
    'confirmInstallation throws PushChallengeExpiredError when challenge is expired',
    async () => {
      const doc = makeDoc({
        status: 'PENDING',
        challenge: {
          tokenHash: 'old-hash',
          expiresAt: new Date(1 * 1000),
          attempts: 0,
        },
      });
      const repository = {
        findById: spy(async () => doc),
      } as unknown as PushRepository;
      const service = createService({ repository });

      await assertRejects(
        () =>
          service.confirmInstallation('inst-1', {
            instance: 'default',
            token: 'test-token',
          }),
        PushChallengeExpiredError,
      );
    },
  );

  // -- updateProfile --------------------------------------------------------

  it(
    'updateProfile throws PushInstallationNotFoundError when installation not found',
    async () => {
      const repository = {
        findById: spy(async () => null),
      } as unknown as PushRepository;
      const service = createService({ repository });

      await assertRejects(
        () =>
          service.updateProfile('inst-1', {
            instance: 'default',
          } as PushProfile),
        PushInstallationNotFoundError,
      );
    },
  );

  it('updateProfile merges app, device, locale, and identity data', async () => {
    const doc = makeDoc();
    const updateProfileSpy = spy(
      async (_id: string, _instance: string, _updates: unknown) => {},
    );
    const repository = {
      findById: spy(async () => doc),
      updateProfile: updateProfileSpy,
    } as unknown as PushRepository;
    const service = createService({ repository });

    const profile: PushProfile = {
      instance: 'default',
      app: { version: '1.0.0', code: 42, build: '123', source: null },
      device: {
        platform: 'ANDROID',
        sdk: 30,
        manufacturer: 'Samsung',
        model: 'S20',
      },
      locale: {
        language: 'en',
        region: 'US',
        timezone: 'UTC',
      },
      capabilities: {
        unifiedPush: true,
        notificationRuntimePermission: null,
        supportsSilentSync: null,
        supportsRichNotifications: null,
      },
      views: null,
      topics: null,
      identity: {
        provider: 'ANILIST',
        anilistUserId: 123,
        state: 'CLIENT_DECLARED',
      },
    } as PushProfile;

    await service.updateProfile('inst-1', profile);

    assertSpyCalls(updateProfileSpy as never, 1);
    const calls = (updateProfileSpy as unknown as SpyWithCalls).calls;
    const updates = calls[0].args[2] as Record<string, unknown>;

    assertEquals(updates.app, profile.app);
    assertEquals(updates.device, profile.device);
    assertEquals(updates.locale, profile.locale);
    assertEquals(updates.capabilities, profile.capabilities);
    assertEquals(updates.anilistUserId, 123);
    assertEquals(updates.identityState, 'CLIENT_DECLARED');
  });

  it(
    'updateProfile converts views to lastView when both fields present',
    async () => {
      const doc = makeDoc();
      const updateProfileSpy = spy(
        async (_id: string, _instance: string, _updates: unknown) => {},
      );
      const repository = {
        findById: spy(async () => doc),
        updateProfile: updateProfileSpy,
      } as unknown as PushRepository;
      const service = createService({ repository });

      await service.updateProfile('inst-1', {
        instance: 'default',
        views: { lastSeen: 'home', lastSeenAt: 1700000000 },
      } as PushProfile);

      assertSpyCalls(updateProfileSpy as never, 1);
      const calls = (updateProfileSpy as unknown as SpyWithCalls).calls;
      const updates = calls[0].args[2] as Record<string, unknown>;

      assertEquals(updates.lastView, {
        name: 'home',
        seenAt: 1700000000,
      });
    },
  );

  it(
    'updateProfile sets anonymous identity when identity is present without userId',
    async () => {
      const doc = makeDoc();
      const updateProfileSpy = spy(
        async (_id: string, _instance: string, _updates: unknown) => {},
      );
      const repository = {
        findById: spy(async () => doc),
        updateProfile: updateProfileSpy,
      } as unknown as PushRepository;
      const service = createService({ repository });

      await service.updateProfile('inst-1', {
        instance: 'default',
        identity: {
          provider: 'ANILIST' as const,
          state: 'CLIENT_DECLARED' as const,
        },
      } as PushProfile);

      assertSpyCalls(updateProfileSpy as never, 1);
      const calls = (updateProfileSpy as unknown as SpyWithCalls).calls;
      const updates = calls[0].args[2] as Record<string, unknown>;

      assertEquals(updates.anilistUserId, undefined);
      assertEquals(updates.identityState, 'ANONYMOUS');
    },
  );

  it('updateProfile also updates topics when profile includes topics', async () => {
    const doc = makeDoc();
    const updateProfileSpy = spy(
      async (_id: string, _instance: string, _updates: unknown) => {},
    );
    const updatePreferencesSpy = spy(
      async (_id: string, _instance: string, _topics: unknown) => {},
    );
    const repository = {
      findById: spy(async () => doc),
      updateProfile: updateProfileSpy,
      updatePreferences: updatePreferencesSpy,
    } as unknown as PushRepository;
    const service = createService({ repository });

    await service.updateProfile('inst-1', {
      instance: 'default',
      topics: { news: true, sync: false },
    } as PushProfile);

    assertSpyCalls(updateProfileSpy as never, 1);
    assertSpyCalls(updatePreferencesSpy as never, 1);
  });

  // -- updatePreferences ----------------------------------------------------

  it(
    'updatePreferences throws PushInstallationNotFoundError when installation not found',
    async () => {
      const repository = {
        findById: spy(async () => null),
      } as unknown as PushRepository;
      const service = createService({ repository });

      await assertRejects(
        () =>
          service.updatePreferences('inst-1', {
            instance: 'default',
            topics: { news: true },
          } as PushPreferences),
        PushInstallationNotFoundError,
      );
    },
  );

  it('updatePreferences calls repository.updatePreferences with topics', async () => {
    const doc = makeDoc();
    const updatePreferencesSpy = spy(
      async (_id: string, _instance: string, _topics: unknown) => {},
    );
    const repository = {
      findById: spy(async () => doc),
      updatePreferences: updatePreferencesSpy,
    } as unknown as PushRepository;
    const service = createService({ repository });

    const preferences: PushPreferences = {
      instance: 'default',
      topics: { news: true, appAnnouncements: false },
    } as PushPreferences;

    await service.updatePreferences('inst-1', preferences);

    assertSpyCalls(updatePreferencesSpy as never, 1);
    const calls = (updatePreferencesSpy as unknown as SpyWithCalls).calls;
    assertEquals(calls[0].args[2], preferences.topics);
  });

  // -- deleteInstallation ---------------------------------------------------

  it(
    'deleteInstallation throws PushInstallationNotFoundError when installation not found',
    async () => {
      const repository = {
        findById: spy(async () => null),
      } as unknown as PushRepository;
      const service = createService({ repository });

      await assertRejects(
        () =>
          service.deleteInstallation('inst-1', {
            instance: 'default',
          } as PushDelete),
        PushInstallationNotFoundError,
      );
    },
  );

  it('deleteInstallation calls repository.disable on found installation', async () => {
    const doc = makeDoc();
    const disableSpy = spy(async (_id: string, _instance: string) => {});
    const repository = {
      findById: spy(async () => doc),
      disable: disableSpy,
    } as unknown as PushRepository;
    const service = createService({ repository });

    await service.deleteInstallation('inst-1', {
      instance: 'default',
      reason: 'user request',
    });

    assertSpyCalls(disableSpy as never, 1);
    const calls = (disableSpy as unknown as SpyWithCalls).calls;
    assertEquals(calls[0].args, ['inst-1', 'default']);
  });

  // -- sendTestPush ---------------------------------------------------------

  it(
    'sendTestPush throws PushInstallationNotFoundError for unknown installation',
    async () => {
      const repository = {
        findById: spy(async () => null),
      } as unknown as PushRepository;
      const service = createService({ repository });

      await assertRejects(
        () => service.sendTestPush('inst-1', 'default'),
        PushInstallationNotFoundError,
      );
    },
  );

  it(
    'sendTestPush throws BadRequestException for non-active installation',
    async () => {
      const doc = makeDoc({ status: 'PENDING' });
      const repository = {
        findById: spy(async () => doc),
      } as unknown as PushRepository;
      const service = createService({ repository });

      await assertRejects(
        () => service.sendTestPush('inst-1', 'default'),
        BadRequestException,
      );
    },
  );

  it('sendTestPush returns success when push is delivered', async () => {
    const doc = makeDoc({ status: 'ACTIVE' });
    const repository = {
      findById: spy(async () => doc),
      markExpired: spy(async () => {}),
    } as unknown as PushRepository;
    const pushSender = {
      subscribe: spy(() => ({})),
      send: spy(async () => ({
        success: true,
        gone: false,
        latencyMs: 5,
      })),
    } as unknown as PushSenderService;
    const service = createService({ repository, pushSender });

    const result = await service.sendTestPush('inst-1', 'default');

    assertEquals(result.success, true);
  });

  it('sendTestPush marks expired when push endpoint returns gone', async () => {
    const doc = makeDoc({ status: 'ACTIVE' });
    const markExpiredSpy = spy(async () => {});
    const repository = {
      findById: spy(async () => doc),
      markExpired: markExpiredSpy,
    } as unknown as PushRepository;
    const pushSender = {
      subscribe: spy(() => ({})),
      send: spy(async () => ({
        success: false,
        gone: true,
        latencyMs: 5,
      })),
    } as unknown as PushSenderService;
    const service = createService({ repository, pushSender });

    const result = await service.sendTestPush('inst-1', 'default');

    assertEquals(result.success, false);
    assertSpyCalls(markExpiredSpy as never, 1);
  });
});

// ---------------------------------------------------------------------------
// Internal helper type for extracting spy calls
// ---------------------------------------------------------------------------

type SpyWithCalls = {
  calls: Array<{ args: unknown[] }>;
};
