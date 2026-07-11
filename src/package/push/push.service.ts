import { Injectable } from '@danet/core';
import { BadRequestException } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { SecretService } from '@scope/secret';
import type { PushNotificationPayload } from '@scope/service/push-sender';
import type { PushSubscription } from '@scope/service/push-sender';
import { PushSenderService } from '@scope/service/push-sender';
import { validatePushEndpoint } from '@scope/common/ssrf';
import {
  type PushInstallationDocument,
  PushRepository,
} from './push.repository.ts';
import { PushDeliveryAttemptRepository } from './push-delivery-attempt.repository.ts';
import { PushRetryService } from './push-retry.service.ts';
import {
  PushChallengeExpiredError,
  PushChallengeInvalidError,
  PushInstallationNotFoundError,
  PushSsrfValidationError,
} from './push.errors.ts';
import type {
  PushChallengeConfirm,
  PushDelete,
  PushInstallationRegistration,
  PushPreferences,
  PushProfile,
} from './push.types.ts';

/**
 * Service layer for Push notification business logic.
 *
 * Coordinates between controller, repository, push sender,
 * and SSRF validation. Manages the full installation lifecycle.
 */
@Injectable()
export class PushService {
  private readonly challengeTtlSeconds: number;
  private readonly isDev: boolean;

  constructor(
    private readonly repository: PushRepository,
    private readonly deliveryRepo: PushDeliveryAttemptRepository,
    private readonly pushSender: PushSenderService,
    private readonly retry: PushRetryService,
    private readonly logger: LoggerService,
    private readonly secret: SecretService,
  ) {
    // Use Deno.env.get directly with defaults for optional push env vars.
    // SecretService.get() throws MissingKeyError on missing keys,
    // which crashes Swagger generation in CI.
    this.challengeTtlSeconds = Number(
      Deno.env.get('PUSH_CHALLENGE_TTL_SECONDS') ?? '300',
    );
    this.isDev = this.secret.environment() === 'development';
  }

  // --- VAPID ---

  async getApplicationServerKey(): Promise<string> {
    return this.pushSender.getApplicationServerKey();
  }

  // --- Registration ---

  /**
   * Register a new installation or update an existing one.
   *
   * 1. Validate the endpoint URL for SSRF safety
   * 2. Upsert the installation document
   * 3. Generate and store a challenge token hash
   * 4. Send challenge push to the endpoint
   *
   * Returns installationId, instance, and pending status.
   */
  async registerInstallation(
    registration: PushInstallationRegistration,
  ): Promise<{
    installationId: string;
    instance: string;
    status: string;
  }> {
    // SSRF validation
    const validation = await validatePushEndpoint(registration.endpoint, {
      allowHttp: this.isDev,
    });

    if (!validation.valid) {
      const endpointHash = await this.sha256(registration.endpoint);
      this.logger.instance.info('Push endpoint rejected by SSRF validation', {
        type: 'push.endpoint.rejected_ssrf',
        endpoint: endpointHash,
      });
      this.logger.instance.warn(
        `SSRF validation failed for endpoint: ${validation.reason}`,
        { endpoint: endpointHash },
      );
      throw new PushSsrfValidationError(
        registration.endpoint,
        validation.reason ?? 'unknown reason',
      );
    }

    // Build document
    const now = this.nowSeconds();
    const doc: PushInstallationDocument = {
      installationId: registration.installationId,
      instance: registration.instance,
      endpoint: registration.endpoint,
      keys: {
        p256dh: registration.keys.p256dh,
        auth: registration.keys.auth,
      },
      status: 'PENDING',
      platform: registration.platform ?? 'ANDROID',
      distributor: registration.distributor ?? undefined,
      app: {
        version: registration.appVersion ?? undefined,
        code: registration.appCode ?? undefined,
        build: registration.appBuild ?? undefined,
      },
      locale: registration.locale
        ? { timezone: registration.timezone ?? undefined }
        : undefined,
      topics: this.topicsFromArray(registration.topics ?? []),
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Upsert (also returns previous doc for observability)
    const { doc: result, wasCreated, previous } = await this.repository.upsert(
      doc,
    );

    if (wasCreated) {
      this.logger.instance.info('Push registration created', {
        type: 'push.registration.created',
        installationId: result.installationId,
        instance: result.instance,
        platform: result.platform,
        ...(result.distributor ? { distributor: result.distributor } : {}),
        topics: result.topics ?? {},
      });
    }

    if (!wasCreated) {
      this.logger.instance.info('Push registration updated', {
        type: 'push.registration.updated',
        installationId: result.installationId,
        instance: result.instance,
        previousStatus: previous?.status ?? 'unknown',
        newStatus: result.status,
      });
    }

    // Generate challenge token
    const token = this.generateChallenge();
    const tokenHash = await this.sha256(token);
    const expiresAt = now + this.challengeTtlSeconds;

    // Store challenge
    await this.repository.storeChallenge(
      result.installationId,
      result.instance,
      tokenHash,
      expiresAt,
    );

    // Send challenge push
    try {
      const subscriber = this.pushSender.subscribe({
        endpoint: registration.endpoint,
        keys: registration.keys,
      });
      await this.deliver(
        subscriber,
        registration.endpoint,
        registration,
        {
          type: 'push.challenge',
          id: crypto.randomUUID(),
          token,
        },
        result.installationId,
        result.instance,
        'push.challenge',
      );

      this.logger.instance.info('Push challenge sent', {
        type: 'push.registration.challenge_sent',
        installationId: result.installationId,
        instance: result.instance,
        endpointHash: await this.sha256(registration.endpoint),
      });
    } catch (error) {
      this.logger.instance.info('Push challenge send failed', {
        type: 'push.registration.challenge_failed',
        installationId: result.installationId,
        instance: result.instance,
        endpointHash: await this.sha256(registration.endpoint),
        error: (error as Error).message,
      });
      // Log but don't fail registration — challenge can be retried
      this.logger.instance.warn(
        `Failed to send challenge push to ${result.installationId}`,
        { cause: error },
      );
    }

    return {
      installationId: result.installationId,
      instance: result.instance,
      status: result.status,
    };
  }

  // --- Challenge Confirmation ---

  /**
   * Confirm that the client received the challenge push.
   *
   * 1. Lookup installation
   * 2. Ensure status is pending
   * 3. Hash submitted token and compare with stored hash
   * 4. Ensure challenge has not expired
   * 5. Mark installation active
   */
  async confirmInstallation(
    installationId: string,
    confirmation: PushChallengeConfirm,
  ): Promise<{
    installationId: string;
    instance: string;
    status: string;
  }> {
    const installation = await this.repository.findById(
      installationId,
      confirmation.instance,
    );

    if (!installation) {
      throw new PushInstallationNotFoundError(installationId);
    }

    if (installation.status !== 'PENDING') {
      throw new BadRequestException();
    }

    if (!installation.challenge) {
      this.logger.instance.info('Push challenge invalid - no challenge found', {
        type: 'push.registration.challenge_invalid',
        installationId,
        instance: confirmation.instance,
      });
      throw new PushChallengeInvalidError(installationId);
    }

    // Check expiry
    const now = this.nowSeconds();
    if (installation.challenge.expiresAt.getTime() < now * 1000) {
      this.logger.instance.info('Push challenge expired', {
        type: 'push.registration.challenge_expired',
        installationId,
        instance: confirmation.instance,
      });
      throw new PushChallengeExpiredError(installationId);
    }

    // Verify token
    const submittedHash = await this.sha256(confirmation.token);
    if (submittedHash !== installation.challenge.tokenHash) {
      this.logger.instance.info('Push challenge invalid - wrong token', {
        type: 'push.registration.challenge_invalid',
        installationId,
        instance: confirmation.instance,
      });
      this.logger.instance.warn(
        `Invalid challenge token for installation ${installationId}`,
      );
      throw new PushChallengeInvalidError(installationId);
    }

    // Activate
    await this.repository.clearChallenge(installationId, confirmation.instance);
    await this.repository.updateStatus(
      installationId,
      confirmation.instance,
      'ACTIVE',
    );

    this.logger.instance.info('Push registration confirmed', {
      type: 'push.registration.confirmed',
      installationId,
      instance: confirmation.instance,
    });

    return {
      installationId,
      instance: confirmation.instance,
      status: 'ACTIVE',
    };
  }

  // --- Profile ---

  /**
   * Update client profile metadata.
   *
   * Merges partial profile data. The identity block is optional
   * and only sent when the app has local AniList auth state.
   */
  async updateProfile(
    installationId: string,
    profile: PushProfile,
  ): Promise<void> {
    const installation = await this.repository.findById(
      installationId,
      profile.instance,
    );

    if (!installation) {
      throw new PushInstallationNotFoundError(installationId);
    }

    const updates: Parameters<
      PushRepository['updateProfile']
    >[2] = {};

    if (profile.app) {
      updates.app = profile.app as PushInstallationDocument['app'];
    }
    if (profile.device) {
      updates.device = profile.device as PushInstallationDocument['device'];
    }
    if (profile.locale) {
      updates.locale = profile.locale as PushInstallationDocument['locale'];
    }
    if (profile.capabilities) {
      updates.capabilities = profile
        .capabilities as PushInstallationDocument['capabilities'];
    }
    if (profile.views?.lastSeen && profile.views?.lastSeenAt) {
      updates.lastView = {
        name: profile.views.lastSeen,
        seenAt: profile.views.lastSeenAt,
      };
    }

    // Client-declared AniList identity
    if (profile.identity?.anilistUserId) {
      updates.anilistUserId = profile.identity.anilistUserId;
      updates.identityState = 'CLIENT_DECLARED';
      this.logger.instance.info('Push identity client-declared', {
        type: 'push.identity.client_declared',
        installationId,
        anilistUserId: profile.identity.anilistUserId,
        state: 'CLIENT_DECLARED',
      });
      this.logger.instance.debug(
        `Client-declared AniList user ${profile.identity.anilistUserId} linked to ${installationId}`,
      );
    } else if (profile.identity && !profile.identity.anilistUserId) {
      // Explicit unlink: identity block present but no userId
      updates.anilistUserId = undefined;
      updates.identityState = 'ANONYMOUS';
      this.logger.instance.info('Push identity unlinked', {
        type: 'push.identity.unlinked',
        installationId,
      });
    }

    await this.repository.updateProfile(
      installationId,
      profile.instance,
      updates,
    );

    const updatedFields = Object.keys(updates).filter(
      (k) => updates[k as keyof typeof updates] !== undefined,
    );
    if (updatedFields.length > 0) {
      this.logger.instance.info('Push profile updated', {
        type: 'push.profile.updated',
        installationId,
        instance: profile.instance,
        fields: updatedFields,
      });
    }

    // Also update topics if present in profile
    if (profile.topics) {
      await this.repository.updatePreferences(
        installationId,
        profile.instance,
        profile.topics as PushInstallationDocument['topics'],
      );
    }
  }

  // --- Preferences ---

  /**
   * Update topic preferences only (lightweight PATCH).
   */
  async updatePreferences(
    installationId: string,
    preferences: PushPreferences,
  ): Promise<void> {
    const installation = await this.repository.findById(
      installationId,
      preferences.instance,
    );

    if (!installation) {
      throw new PushInstallationNotFoundError(installationId);
    }

    await this.repository.updatePreferences(
      installationId,
      preferences.instance,
      preferences.topics as PushInstallationDocument['topics'],
    );

    this.logger.instance.info('Push preferences updated', {
      type: 'push.preferences.updated',
      installationId,
      instance: preferences.instance,
      topics: preferences.topics,
    });
  }

  // --- Deletion ---

  /**
   * Disable (soft-delete) an installation.
   */
  async deleteInstallation(
    installationId: string,
    deletion: PushDelete,
  ): Promise<void> {
    const installation = await this.repository.findById(
      installationId,
      deletion.instance,
    );

    if (!installation) {
      throw new PushInstallationNotFoundError(installationId);
    }

    await this.repository.disable(installationId, deletion.instance);

    this.logger.instance.debug(
      `Push installation ${installationId} disabled: ${
        deletion.reason ?? 'no reason provided'
      }`,
    );
  }

  // --- Test Push ---

  /**
   * Send a test push notification to an active installation.
   *
   * Used for development and QA. The installation must be active.
   */
  async sendTestPush(
    installationId: string,
    instance: string,
  ): Promise<{ success: boolean }> {
    const installation = await this.repository.findById(
      installationId,
      instance,
    );

    if (!installation) {
      throw new PushInstallationNotFoundError(installationId);
    }

    if (installation.status !== 'ACTIVE') {
      throw new BadRequestException();
    }

    const subscriber = this.pushSender.subscribe({
      endpoint: installation.endpoint,
      keys: installation.keys,
    });

    const { success, gone } = await this.deliver(
      subscriber,
      installation.endpoint,
      { endpoint: installation.endpoint, keys: installation.keys },
      {
        type: 'push.test',
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      },
      installationId,
      instance,
      'push.test',
    );

    if (gone) {
      await this.repository.markExpired(installationId, instance);
    }

    return { success };
  }

  // --- Fan-Out (news) ---

  /**
   * Send a news.available push to all active installations
   * subscribed to the news topic.
   */
  async fanOutToNewsSubscribers(): Promise<void> {
    const installations = await this.repository.findActiveByTopic('news');

    if (installations.length === 0) return;

    this.logger.instance.info('Push fan-out started', {
      type: 'push.fanout.started',
      notificationType: 'news.available',
      candidateCount: installations.length,
    });

    const payload = {
      type: 'news.available' as const,
      id: crypto.randomUUID(),
      sync: {
        resource: 'news' as const,
        since: Date.now(),
      },
    };

    let sent = 0;
    let failed = 0;
    let goneCount = 0;
    const startMs = Date.now();

    for (const installation of installations) {
      try {
        const subscriber = this.pushSender.subscribe({
          endpoint: installation.endpoint,
          keys: installation.keys,
        });

        const { success, gone } = await this.deliver(
          subscriber,
          installation.endpoint,
          { endpoint: installation.endpoint, keys: installation.keys },
          payload,
          installation.installationId,
          installation.instance,
          'news.available',
        );

        if (gone) {
          await this.repository.markExpired(
            installation.installationId,
            installation.instance,
          );
          goneCount++;
        } else if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        this.logger.instance.warn(
          `News fan-out failed for ${installation.installationId}`,
          { cause: error },
        );
      }
    }

    const totalMs = Date.now() - startMs;
    this.logger.instance.info('Push fan-out completed', {
      type: 'push.fanout.completed',
      notificationType: 'news.available',
      sent,
      failed,
      gone: goneCount,
      totalMs,
    });

    if (sent > 0 || failed > 0) {
      this.logger.instance.debug(
        `News fan-out complete: ${sent} sent, ${failed} failed`,
      );
    }
  }

  // --- Helpers ---

  /**
   * Send a push notification and persist the delivery outcome.
   *
   * Persistence is fire-and-forget: a failure to record the
   * attempt does not affect the returned delivery result.
   */
  private async deliver(
    subscriber: ReturnType<PushSenderService['subscribe']>,
    endpoint: string,
    subscription: PushSubscription,
    payload: Record<string, unknown>,
    installationId: string,
    instance: string,
    type: string,
  ): Promise<{ success: boolean; gone: boolean }> {
    const result = await this.pushSender.send(
      subscriber,
      endpoint,
      payload as PushNotificationPayload,
      installationId,
    );

    const endpointHash = await this.sha256(endpoint);

    const deliveryMeta = {
      installationId,
      instance,
      notificationType: type,
      latencyMs: result.latencyMs,
      attempt: 0, // initial delivery always attempt 0
    };

    if (result.success && !result.gone) {
      this.logger.instance.info('Push delivery sent', {
        type: 'push.delivery.sent',
        ...deliveryMeta,
      });
    } else if (result.gone) {
      this.logger.instance.info('Push delivery endpoint gone', {
        type: 'push.delivery.gone',
        ...deliveryMeta,
      });
    } else if (
      result.statusCode === 400 ||
      result.statusCode === 401 ||
      result.statusCode === 403
    ) {
      this.logger.instance.info('Push delivery failed', {
        type: 'push.delivery.failed',
        ...deliveryMeta,
        statusCode: result.statusCode,
        error: result.error,
      });
    } else {
      // 429, 5xx, or no status code — retryable
      this.logger.instance.info('Push delivery retryable failure', {
        type: 'push.delivery.retryable',
        ...deliveryMeta,
        statusCode: result.statusCode,
        error: result.error,
      });
    }

    // Fire-and-forget: record the delivery attempt
    this.deliveryRepo.insert({
      installationId,
      instance,
      endpointHash,
      type,
      id: (payload as { id: string }).id ?? '',
      success: result.success,
      gone: result.gone,
      statusCode: result.statusCode,
      error: result.error,
      latencyMs: result.latencyMs,
      attemptedAt: new Date(),
    }).catch((error) => {
      this.logger.instance.warn(
        'Failed to persist delivery attempt',
        { cause: error },
      );
    });

    // Enqueue retry for retryable failures
    if (!result.success && !result.gone) {
      const retryable = !result.statusCode ||
        result.statusCode === 429 ||
        result.statusCode >= 500;
      if (retryable) {
        this.retry.enqueue({
          installationId,
          instance,
          endpoint,
          keys: subscription.keys,
          payload,
          type,
        }).catch((error) => {
          this.logger.instance.warn(
            'Failed to enqueue retry',
            { cause: error },
          );
        });
      }
    }

    return { success: result.success, gone: result.gone };
  }

  private generateChallenge(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private async sha256(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }

  private nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  private topicsFromArray(
    arr: string[],
  ): PushInstallationDocument['topics'] {
    const enumToKey: Record<
      string,
      keyof NonNullable<PushInstallationDocument['topics']>
    > = {
      'NEWS': 'news',
      'APP_ANNOUNCEMENTS': 'appAnnouncements',
      'SYNC': 'sync',
    };
    const topics: PushInstallationDocument['topics'] = {};
    for (const t of arr) {
      const key = enumToKey[t];
      if (key) {
        topics[key] = true;
      }
    }
    return topics;
  }
}
