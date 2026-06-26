import { Injectable } from '@danet/core';
import { BadRequestException } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { SecretService } from '@scope/secret';
import { PushSenderService } from '@scope/service/push-sender';
import { validatePushEndpoint } from '@scope/common/ssrf';
import {
  type PushInstallationDocument,
  PushRepository,
} from './push.repository.ts';
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
    private readonly pushSender: PushSenderService,
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
      this.logger.instance.warn(
        `SSRF validation failed for endpoint: ${validation.reason}`,
        { endpoint: registration.endpoint },
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
      status: 'pending',
      platform: registration.platform ?? 'android',
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

    // Upsert
    const result = await this.repository.upsert(doc);

    // Generate challenge token
    const token = this.generateChallengeToken();
    const tokenHash = await this.hashToken(token);
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
      await this.pushSender.send(
        subscriber,
        registration.endpoint,
        {
          type: 'push.challenge',
          id: crypto.randomUUID(),
          token,
        },
        result.installationId,
      );
    } catch (error) {
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

    if (installation.status !== 'pending') {
      throw new BadRequestException();
    }

    if (!installation.challenge) {
      throw new PushChallengeInvalidError(installationId);
    }

    // Check expiry
    const now = this.nowSeconds();
    if (installation.challenge.expiresAt < now) {
      throw new PushChallengeExpiredError(installationId);
    }

    // Verify token
    const submittedHash = await this.hashToken(confirmation.token);
    if (submittedHash !== installation.challenge.tokenHash) {
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
      'active',
    );

    return {
      installationId,
      instance: confirmation.instance,
      status: 'active',
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
      updates.identityState = 'client-declared';
      this.logger.instance.debug(
        `Client-declared AniList user ${profile.identity.anilistUserId} linked to ${installationId}`,
      );
    } else if (profile.identity && !profile.identity.anilistUserId) {
      // Explicit unlink: identity block present but no userId
      updates.anilistUserId = undefined;
      updates.identityState = 'anonymous';
    }

    await this.repository.updateProfile(
      installationId,
      profile.instance,
      updates,
    );

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

    if (installation.status !== 'active') {
      throw new BadRequestException();
    }

    const subscriber = this.pushSender.subscribe({
      endpoint: installation.endpoint,
      keys: installation.keys,
    });

    const result = await this.pushSender.send(
      subscriber,
      installation.endpoint,
      {
        type: 'push.test',
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      },
      installationId,
    );

    if (result.gone) {
      await this.repository.markExpired(installationId, instance);
    }

    return { success: result.success };
  }

  // --- Fan-Out (news) ---

  /**
   * Send a news.available push to all active installations
   * subscribed to the news topic.
   */
  async fanOutToNewsSubscribers(): Promise<void> {
    const installations = await this.repository.findActiveByTopic('news');

    if (installations.length === 0) return;

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

    for (const installation of installations) {
      try {
        const subscriber = this.pushSender.subscribe({
          endpoint: installation.endpoint,
          keys: installation.keys,
        });

        const result = await this.pushSender.send(
          subscriber,
          installation.endpoint,
          payload,
          installation.installationId,
        );

        if (result.gone) {
          await this.repository.markExpired(
            installation.installationId,
            installation.instance,
          );
        }

        if (result.success) sent++;
        else failed++;
      } catch (error) {
        failed++;
        this.logger.instance.warn(
          `News fan-out failed for ${installation.installationId}`,
          { cause: error },
        );
      }
    }

    if (sent > 0 || failed > 0) {
      this.logger.instance.debug(
        `News fan-out complete: ${sent} sent, ${failed} failed`,
      );
    }
  }

  // --- Helpers ---

  private generateChallengeToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }

  private nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  private topicsFromArray(
    arr: string[],
  ): PushInstallationDocument['topics'] {
    const topics: PushInstallationDocument['topics'] = {};
    for (const t of arr) {
      if (
        t === 'news' || t === 'appAnnouncements' || t === 'sync'
      ) {
        (topics as Record<string, boolean>)[t] = true;
      }
    }
    return topics;
  }
}
