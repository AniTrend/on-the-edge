/**
 * Type definitions for the Push Sender service.
 *
 * Bridges the @negrel/webpush library types with the
 * on-the-edge internal domain model.
 */

/**
 * JSON Web Key representation for ECDH keys.
 * Mirrors the JWK format used by @negrel/webpush internally.
 */
export interface JsonWebKey {
  kty: string;
  crv: string;
  x: string;
  y: string;
  d?: string;
}

/**
 * Exported VAPID key pair in JWK format, as produced
 * and consumed by @negrel/webpush.
 */
export interface ExportedVapidKeys {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

/**
 * A Web Push subscription as received from the client
 * (the Android UnifiedPush connector).
 */
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Compact push notification payload sent to the client.
 * The Android app owns rendering decisions.
 */
export interface PushNotificationPayload {
  type: string;
  id: string;
  [key: string]: unknown;
}

/**
 * Result of a push delivery attempt.
 */
export interface PushDeliveryResult {
  installationId: string;
  endpoint: string;
  success: boolean;
  gone: boolean;
  statusCode?: number;
  error?: string;
  latencyMs: number;
}
