import {
  ApplicationServer,
  exportVapidKeys,
  generateVapidKeys,
  importVapidKeys,
  PushMessageError,
  type PushSubscriber,
} from '@negrel/webpush';
import { Injectable, SCOPE } from '@danet/core';
import { OnAppBootstrap } from '@danet/core/hook';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { between } from '@onjara/optic/profileMeasure';
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
      const encoded = this.secret.get<string>('PUSH_VAPID_KEYS');
      const decoded = JSON.parse(atob(encoded));
      const vapidKeys = await importVapidKeys(
        decoded,
        { extractable: false },
      );

      this.applicationServer = await ApplicationServer.new({
        contactInformation: this.secret.get<string>('PUSH_VAPID_SUBJECT'),
        vapidKeys,
      });

      this.logger.instance.debug(
        'Push sender ApplicationServer initialized',
      );
    } catch (error) {
      this.logger.instance.error(
        'Failed to initialize push sender',
        { cause: error },
      );
      throw error;
    } finally {
      this.logger.instance.mark('push-sender-init-end');
      this.logger.instance.measure(
        between('push-sender-init-start', 'push-sender-init-end'),
      );
    }
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
    const keys = await generateVapidKeys();
    const exported = await exportVapidKeys(keys);
    const encoded = btoa(JSON.stringify(exported));
    return { encoded, publicKey: '' };
  }
}
