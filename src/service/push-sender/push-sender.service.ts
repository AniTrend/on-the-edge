import {
  ApplicationServer,
  importVapidKeys,
  PushMessageError,
  type PushSubscriber,
} from '@negrel/webpush';
import { Injectable, SCOPE } from '@danet/core';
import { OnAppBootstrap } from '@danet/core/hook';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { between } from '@onjara/optic/profileMeasure';
import { ExportedVapidKeysSchema } from './push-sender.schema.ts';
import type {
  PushDeliveryResult,
  PushNotificationPayload,
  PushSubscription,
} from './push-sender.types.ts';

/**
 * Service wrapping @negrel/webpush for sending Web Push notifications.
 *
 * Maintains a singleton ApplicationServer instance with VAPID keys
 * loaded from environment configuration. Supports subscribing push
 * endpoints and delivering encrypted payloads.
 *
 * VAPID key rotation requires application restart.
 */
@Injectable({ scope: SCOPE.GLOBAL })
export class PushSenderService implements OnAppBootstrap {
  private applicationServer!: ApplicationServer;

  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {}

  async onAppBootstrap(): Promise<void> {
    this.logger.instance.mark('push-sender-init-start');

    try {
      let encoded: string;
      try {
        encoded = this.secret.get<string>('PUSH_VAPID_KEYS');
      } catch (error) {
        this.warnNotInitialized(
          'PUSH_VAPID_KEYS is missing or could not be read',
          error,
        );
        return;
      }

      let decoded: unknown;
      try {
        decoded = JSON.parse(atob(encoded));
      } catch (error) {
        this.warnNotInitialized(
          'PUSH_VAPID_KEYS is not valid base64-encoded JSON',
          error,
        );
        return;
      }

      const parsed = ExportedVapidKeysSchema.safeParse(decoded);
      if (!parsed.success) {
        this.warnNotInitialized(
          'PUSH_VAPID_KEYS does not contain a valid VAPID key pair',
          parsed.error,
        );
        return;
      }

      let contactInformation: string;
      try {
        contactInformation = this.secret.get<string>('PUSH_VAPID_SUBJECT');
      } catch (error) {
        this.warnNotInitialized(
          'PUSH_VAPID_SUBJECT is missing or could not be read',
          error,
        );
        return;
      }

      const vapidKeys = await importVapidKeys(
        parsed.data,
        { extractable: false },
      );

      this.applicationServer = await ApplicationServer.new({
        contactInformation,
        vapidKeys,
      });

      this.logger.instance.debug(
        'Push sender ApplicationServer initialized',
      );
    } catch (error) {
      this.warnNotInitialized(
        'the Web Push library rejected the VAPID keys',
        error,
      );
    } finally {
      this.logger.instance.mark('push-sender-init-end');
      this.logger.instance.measure(
        between('push-sender-init-start', 'push-sender-init-end'),
      );
    }
  }

  /**
   * Logs a classified initialization failure. Never throws: the
   * application starts without push delivery when configuration is
   * missing or malformed.
   */
  private warnNotInitialized(reason: string, cause: unknown): void {
    this.logger.instance.warn(
      `Push sender not initialized: ${reason}. Push delivery will be unavailable until configured.`,
      { cause },
    );
  }

  /**
   * Returns the VAPID public key as a base64url string suitable
   * for Android's PushManager.subscribe applicationServerKey.
   */
  async getApplicationServerKey(): Promise<string> {
    if (!this.applicationServer) {
      throw new Error(
        'PushSenderService not initialized — VAPID keys not loaded',
      );
    }
    const raw = await this.applicationServer.getVapidPublicKeyRaw();
    // Convert Uint8Array to base64url (standard Web Push format)
    return btoa(String.fromCharCode(...raw))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Subscribe a push endpoint for delivery.
   */
  subscribe(subscription: PushSubscription): PushSubscriber {
    if (!this.applicationServer) {
      throw new Error(
        'PushSenderService not initialized — ApplicationServer not available',
      );
    }
    return this.applicationServer.subscribe({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  /**
   * Send a push notification to a single subscriber.
   *
   * The endpoint parameter is the original push endpoint URL
   * (PushSubscriber does not expose it publicly).
   */
  async send(
    subscriber: PushSubscriber,
    endpoint: string,
    payload: PushNotificationPayload,
    installationId: string,
  ): Promise<PushDeliveryResult> {
    const startTime = Date.now();

    try {
      await subscriber.pushTextMessage(
        JSON.stringify(payload),
        {
          ttl: 86400,
        },
      );

      return {
        installationId,
        endpoint,
        success: true,
        gone: false,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof PushMessageError) {
        if (error.isGone()) {
          this.logger.instance.warn(
            `Push endpoint gone for installation ${installationId}`,
            { endpoint },
          );
          return {
            installationId,
            endpoint,
            success: false,
            gone: true,
            statusCode: error.response.status,
            error: error.message,
            latencyMs,
          };
        }

        this.logger.instance.warn(
          `Push delivery failed for installation ${installationId}`,
          {
            status: error.response.status,
            endpoint,
          },
        );

        return {
          installationId,
          endpoint,
          success: false,
          gone: false,
          statusCode: error.response.status,
          error: error.message,
          latencyMs,
        };
      }

      this.logger.instance.error(
        `Unexpected push delivery error for installation ${installationId}`,
        { cause: error, endpoint },
      );

      return {
        installationId,
        endpoint,
        success: false,
        gone: false,
        error: error instanceof Error ? error.message : String(error),
        latencyMs,
      };
    }
  }

  /**
   * Generate new VAPID keys for development/setup.
   * Not for production use — keys should be externally provisioned.
   */
  static async generateDevKeys(): Promise<{
    encoded: string;
    publicKey: string;
  }> {
    // VAPID uses ECDSA P-256 keys (RFC 8292). Extractable keys are
    // required so the pair can be exported into the PUSH_VAPID_KEYS
    // format; the parse step keeps only the format members, producing
    // a blob the service can import back.
    const pair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const keys = ExportedVapidKeysSchema.parse({
      publicKey: await crypto.subtle.exportKey('jwk', pair.publicKey),
      privateKey: await crypto.subtle.exportKey('jwk', pair.privateKey),
    });
    const encoded = btoa(JSON.stringify(keys));
    return { encoded, publicKey: '' };
  }
}
