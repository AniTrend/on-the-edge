import { beforeEach, describe, it } from '@std/testing/bdd';
import { assert, assertEquals, assertExists } from '@std/assert';
import { createMockLogger } from '@scope/common/testing';
import { type MongoService } from '@scope/database';
import { InMemoryCollection } from '@scope/database/testing';
import type {
  BulkWriteOptions,
  DeleteResult,
  Filter,
  FindOneAndReplaceOptions,
  FindOptions,
  OptionalUnlessRequiredId,
  UpdateFilter,
  UpdateOptions,
  WithId,
} from 'mongodb';
import {
  type PushInstallationDocument,
  PushRepository,
} from './push.repository.ts';

// --- Mock wrappers ---

class MockMongoCollection {
  constructor(
    private readonly memoryCollection: InMemoryCollection<
      PushInstallationDocument
    >,
  ) {}

  find(
    filter: Filter<PushInstallationDocument>,
    options?: FindOptions<PushInstallationDocument>,
  ) {
    return {
      toArray: () => this.memoryCollection.find(filter, options),
    };
  }

  findOne<T>(
    filter: Filter<PushInstallationDocument>,
    options?: FindOptions<PushInstallationDocument>,
  ): Promise<T | null> {
    return this.memoryCollection.findOne(filter, options) as Promise<T | null>;
  }

  findOneAndReplace(
    filter: Filter<PushInstallationDocument>,
    replacement: PushInstallationDocument,
    options: FindOneAndReplaceOptions,
  ): Promise<WithId<PushInstallationDocument> | null> {
    return this.memoryCollection.findOneAndReplace(
      filter,
      replacement,
      options,
    );
  }

  updateOne(
    filter: Filter<PushInstallationDocument>,
    update: UpdateFilter<PushInstallationDocument>,
    options?: UpdateOptions,
  ) {
    return this.memoryCollection.updateOne(filter, update, options);
  }

  deleteMany(
    filter: Filter<PushInstallationDocument>,
  ): Promise<DeleteResult> {
    return this.memoryCollection.deleteMany(filter);
  }

  insertMany(
    docs: ReadonlyArray<OptionalUnlessRequiredId<PushInstallationDocument>>,
    options?: BulkWriteOptions,
  ) {
    return this.memoryCollection.insertMany(docs, options);
  }
}

class MockMongoService {
  constructor(private readonly memoryCollection: MockMongoCollection) {}

  collection<T>(_name: string): MockMongoCollection {
    return this.memoryCollection as unknown as MockMongoCollection & T;
  }
}

// --- Test helper ---

const createPushDocument = (
  overrides: Partial<PushInstallationDocument> = {},
): PushInstallationDocument => ({
  installationId: 'test-install-1',
  instance: 'default',
  endpoint: 'https://push.example.com/test',
  keys: { p256dh: 'key1', auth: 'auth1' },
  status: 'PENDING',
  platform: 'ANDROID',
  topics: { news: true },
  failureCount: 0,
  createdAt: 1700000000,
  updatedAt: 1700000000,
  ...overrides,
});

// --- Tests ---

describe('PushRepository', () => {
  let collection: InMemoryCollection<PushInstallationDocument>;
  let logger: ReturnType<typeof createMockLogger>['logger'];

  beforeEach(() => {
    collection = new InMemoryCollection<PushInstallationDocument>();
    logger = createMockLogger().logger;
  });

  const createRepo = () =>
    new PushRepository(
      new MockMongoService(
        new MockMongoCollection(collection),
      ) as unknown as MongoService,
      logger,
    );

  describe('upsert', () => {
    it('creates a new installation document', async () => {
      const repo = createRepo();
      const doc = createPushDocument({
        installationId: 'inst-1',
        instance: 'default',
      });

      const { doc: result, wasCreated } = await repo.upsert(doc);

      assertExists(result);
      assertEquals(wasCreated, true);
      assertEquals(result.installationId, 'inst-1');
      assertEquals(result.instance, 'default');
      assertEquals(result.status, 'PENDING');

      const found = await repo.findById('inst-1', 'default');
      assertExists(found);
      assertEquals(found.installationId, 'inst-1');
    });

    it('updates an existing installation by installationId + instance', async () => {
      const repo = createRepo();

      // First insert
      await repo.upsert(
        createPushDocument({
          installationId: 'inst-2',
          instance: 'default',
          endpoint: 'https://old.example.com',
          status: 'PENDING',
        }),
      );

      // Then upsert with same composite key
      const { doc: updated, wasCreated } = await repo.upsert(
        createPushDocument({
          installationId: 'inst-2',
          instance: 'default',
          endpoint: 'https://new.example.com',
          status: 'ACTIVE',
        }),
      );

      assertExists(updated);
      assertEquals(wasCreated, false);
      assertEquals(updated.endpoint, 'https://new.example.com');
      assertEquals(updated.status, 'ACTIVE');

      // Verify only one document exists for this key
      const found = await repo.findById('inst-2', 'default');
      assertExists(found);
      assertEquals(found.endpoint, 'https://new.example.com');

      // Count total: we should only have 1 doc
      const count = await collection.countDocuments({
        installationId: 'inst-2',
      });
      assertEquals(count, 1);
    });

    it('keeps separate installations for different instances', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'inst-3',
          instance: 'alpha',
          endpoint: 'https://alpha.example.com',
        }),
      );

      await repo.upsert(
        createPushDocument({
          installationId: 'inst-3',
          instance: 'beta',
          endpoint: 'https://beta.example.com',
        }),
      );

      const alpha = await repo.findById('inst-3', 'alpha');
      const beta = await repo.findById('inst-3', 'beta');

      assertExists(alpha);
      assertExists(beta);
      assertEquals(alpha.endpoint, 'https://alpha.example.com');
      assertEquals(beta.endpoint, 'https://beta.example.com');
    });
  });

  describe('findById', () => {
    it('finds an installation by installationId + instance', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'find-me',
          instance: 'prod',
          endpoint: 'https://find.example.com',
        }),
      );

      const found = await repo.findById('find-me', 'prod');
      assertExists(found);
      assertEquals(found.endpoint, 'https://find.example.com');
    });

    it('returns null when installation is not found', async () => {
      const repo = createRepo();

      const found = await repo.findById('nobody', 'nowhere');
      assertEquals(found, null);
    });
  });

  describe('findByEndpoint', () => {
    it('finds an installation by endpoint URL', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'ep-1',
          instance: 'default',
          endpoint: 'https://unique.example.com/ep1',
        }),
      );

      const found = await repo.findByEndpoint('https://unique.example.com/ep1');
      assertExists(found);
      assertEquals(found.installationId, 'ep-1');
    });

    it('returns null for a non-existent endpoint', async () => {
      const repo = createRepo();

      const found = await repo.findByEndpoint('https://no.such.endpoint/');
      assertEquals(found, null);
    });
  });

  describe('findActiveByTopic', () => {
    it('returns only active installations subscribed to the given topic', async () => {
      const repo = createRepo();

      // Active, subscribed to news
      await repo.upsert(
        createPushDocument({
          installationId: 'active-news',
          instance: 'default',
          status: 'ACTIVE',
          topics: { news: true },
        }),
      );

      // Active, NOT subscribed to news
      await repo.upsert(
        createPushDocument({
          installationId: 'active-no-news',
          instance: 'default',
          status: 'ACTIVE',
          topics: { news: false },
        }),
      );

      // Pending, subscribed to news (should not appear)
      await repo.upsert(
        createPushDocument({
          installationId: 'pending-news',
          instance: 'default',
          status: 'PENDING',
          topics: { news: true },
        }),
      );

      // Disabled, subscribed to news (should not appear)
      await repo.upsert(
        createPushDocument({
          installationId: 'disabled-news',
          instance: 'default',
          status: 'DISABLED',
          topics: { news: true },
        }),
      );

      const results = await repo.findActiveByTopic('news');
      assertEquals(results.length, 1);
      assertEquals(results[0].installationId, 'active-news');
    });

    it('returns empty array when no active installations match the topic', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'pending-only',
          instance: 'default',
          status: 'PENDING',
          topics: { news: true },
        }),
      );

      const results = await repo.findActiveByTopic('news');
      assertEquals(results.length, 0);
    });
  });

  describe('findActiveByAnilistUserId', () => {
    it('returns active installations with matching AniList user id and client-declared state', async () => {
      const repo = createRepo();

      // Matching
      await repo.upsert(
        createPushDocument({
          installationId: 'match-1',
          instance: 'default',
          status: 'ACTIVE',
          anilistUserId: 12345,
          identityState: 'CLIENT_DECLARED',
        }),
      );

      // Active but anonymous (should not appear)
      await repo.upsert(
        createPushDocument({
          installationId: 'anon-1',
          instance: 'default',
          status: 'ACTIVE',
          anilistUserId: 12345,
          identityState: 'ANONYMOUS',
        }),
      );

      // Client-declared but disabled
      await repo.upsert(
        createPushDocument({
          installationId: 'disabled-1',
          instance: 'default',
          status: 'DISABLED',
          anilistUserId: 12345,
          identityState: 'CLIENT_DECLARED',
        }),
      );

      // Different user
      await repo.upsert(
        createPushDocument({
          installationId: 'other-user',
          instance: 'default',
          status: 'ACTIVE',
          anilistUserId: 99999,
          identityState: 'CLIENT_DECLARED',
        }),
      );

      const results = await repo.findActiveByAnilistUserId(12345);
      assertEquals(results.length, 1);
      assertEquals(results[0].installationId, 'match-1');
    });

    it('returns empty array when no matching installations exist', async () => {
      const repo = createRepo();

      const results = await repo.findActiveByAnilistUserId(40400);
      assertEquals(results.length, 0);
    });
  });

  describe('updateStatus', () => {
    it('transitions status and sets lastConfirmedAt when activating', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'status-1',
          instance: 'default',
          status: 'PENDING',
        }),
      );

      await repo.updateStatus('status-1', 'default', 'ACTIVE');

      const updated = await repo.findById('status-1', 'default');
      assertExists(updated);
      assertEquals(updated.status, 'ACTIVE');
      assert(updated.lastConfirmedAt !== undefined);
      assert(updated.lastConfirmedAt! > 0);
    });

    it('transitions status to disabled without setting lastConfirmedAt', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'status-2',
          instance: 'default',
          status: 'ACTIVE',
        }),
      );

      await repo.updateStatus('status-2', 'default', 'DISABLED');

      const updated = await repo.findById('status-2', 'default');
      assertExists(updated);
      assertEquals(updated.status, 'DISABLED');
      // lastConfirmedAt should NOT be set for non-active transitions
      assertEquals(updated.lastConfirmedAt ?? null, null);
    });

    it('updates the updatedAt timestamp', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'status-3',
          instance: 'default',
        }),
      );

      const original = await repo.findById('status-3', 'default');
      assertExists(original);

      await repo.updateStatus('status-3', 'default', 'EXPIRED');

      const updated = await repo.findById('status-3', 'default');
      assertExists(updated);
      // nowSeconds() may return the same value if both calls fall in the same second
      assert(updated.updatedAt >= original.updatedAt);
      assert(updated.updatedAt > 0);
    });
  });

  describe('disable', () => {
    it('soft-deletes to disabled status', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'del-1',
          instance: 'default',
          status: 'ACTIVE',
        }),
      );

      await repo.disable('del-1', 'default');

      const updated = await repo.findById('del-1', 'default');
      assertExists(updated);
      assertEquals(updated.status, 'DISABLED');
    });
  });

  describe('markExpired', () => {
    it('marks an installation as expired', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'exp-1',
          instance: 'default',
          status: 'ACTIVE',
        }),
      );

      await repo.markExpired('exp-1', 'default');

      const updated = await repo.findById('exp-1', 'default');
      assertExists(updated);
      assertEquals(updated.status, 'EXPIRED');
    });
  });

  describe('storeChallenge', () => {
    it('stores challenge hash and sets status to pending', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'ch-1',
          instance: 'default',
          status: 'ACTIVE',
        }),
      );

      await repo.storeChallenge(
        'ch-1',
        'default',
        'hash-abc123',
        1700100000,
      );

      const updated = await repo.findById('ch-1', 'default');
      assertExists(updated);
      assertEquals(updated.status, 'PENDING');
      assertExists(updated.challenge);
      assertEquals(updated.challenge!.tokenHash, 'hash-abc123');
      assertEquals(
        updated.challenge!.expiresAt.getTime(),
        new Date(1700100000 * 1000).getTime(),
      );
      assertEquals(updated.challenge!.attempts, 0);
    });

    it('clears previous challenge data on re-challenge', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'ch-2',
          instance: 'default',
          status: 'PENDING',
          challenge: {
            tokenHash: 'old-hash',
            expiresAt: new Date(1700000000 * 1000),
            attempts: 2,
          },
        }),
      );

      await repo.storeChallenge(
        'ch-2',
        'default',
        'new-hash',
        1700200000,
      );

      const updated = await repo.findById('ch-2', 'default');
      assertExists(updated);
      assertEquals(updated.challenge!.tokenHash, 'new-hash');
      assertEquals(
        updated.challenge!.expiresAt.getTime(),
        new Date(1700200000 * 1000).getTime(),
      );
      assertEquals(updated.challenge!.attempts, 0);
    });
  });

  describe('updateProfile', () => {
    it('merges partial profile fields', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'prof-1',
          instance: 'default',
        }),
      );

      await repo.updateProfile('prof-1', 'default', {
        app: { version: '2.0.1', code: 42 },
        device: { manufacturer: 'Samsung', model: 'Galaxy S' },
        locale: { language: 'en', region: 'US' },
      });

      const updated = await repo.findById('prof-1', 'default');
      assertExists(updated);
      assertEquals(updated.app!.version, '2.0.1');
      assertEquals(updated.app!.code, 42);
      assertEquals(updated.device!.manufacturer, 'Samsung');
      assertEquals(updated.locale!.language, 'en');
    });

    it('sets lastProfileSyncAt and updatedAt', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'prof-2',
          instance: 'default',
        }),
      );

      await repo.updateProfile('prof-2', 'default', {
        capabilities: { unifiedPush: true },
      });

      const updated = await repo.findById('prof-2', 'default');
      assertExists(updated);
      assert(updated.lastProfileSyncAt !== undefined);
      assert(updated.lastProfileSyncAt! > 0);
    });

    it('handles empty updates gracefully', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'prof-3',
          instance: 'default',
          anilistUserId: 500,
        }),
      );

      // Pass an empty object (no fields)
      await repo.updateProfile('prof-3', 'default', {});

      const updated = await repo.findById('prof-3', 'default');
      assertExists(updated);
      // Existing fields should be preserved
      assertEquals(updated.anilistUserId, 500);
    });
  });

  describe('updatePreferences', () => {
    it('updates topics', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'pref-1',
          instance: 'default',
          topics: { news: false, appAnnouncements: false },
        }),
      );

      await repo.updatePreferences('pref-1', 'default', {
        news: true,
        appAnnouncements: true,
      });

      const updated = await repo.findById('pref-1', 'default');
      assertExists(updated);
      assertEquals(updated.topics!.news, true);
      assertEquals(updated.topics!.appAnnouncements, true);
    });

    it('updates the updatedAt timestamp', async () => {
      const repo = createRepo();

      await repo.upsert(
        createPushDocument({
          installationId: 'pref-2',
          instance: 'default',
        }),
      );

      const original = await repo.findById('pref-2', 'default');
      assertExists(original);

      await repo.updatePreferences('pref-2', 'default', {
        news: false,
        sync: true,
      });

      const updated = await repo.findById('pref-2', 'default');
      assertExists(updated);
      // nowSeconds() may return the same value if both calls fall in the same second
      assert(updated.updatedAt >= original.updatedAt);
      assert(updated.updatedAt > 0);
    });
  });
});
