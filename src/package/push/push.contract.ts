/**
 * Public OpenAPI contract schemas for the Push domain.
 *
 * These define the stable public API surface consumed by
 * clients (Android app) and edge-graphql (GraphQL Mesh).
 */

import { z } from '@scope/common/openapi';

// --- VAPID ---

export const PushVapidContract = z.object({
  applicationServerKey: z.string().openapi({
    description: 'Base64url-encoded VAPID public key for Web Push subscription',
    example: 'BLbL...vFc',
  }),
}).openapi({
  title: 'PushVapid',
  description: 'VAPID public key for Android Web Push subscription',
});

// --- Installation Status ---

export const PushInstallationStatusContract = z.enum([
  'PENDING',
  'ACTIVE',
  'DISABLED',
  'EXPIRED',
  'REVOKED',
]).openapi({
  title: 'PushInstallationStatus',
  description: 'Lifecycle status of a push installation',
});

// --- Registration Response ---

export const PushInstallationContract = z.object({
  installationId: z.string().openapi({
    description: 'Stable client-generated installation identifier',
  }),
  instance: z.string().openapi({
    description: 'UnifiedPush instance identifier',
  }),
  status: PushInstallationStatusContract,
}).openapi({
  title: 'PushInstallation',
  description: 'Push installation registration state',
});

// --- Profile (abbreviated for Swagger) ---

export const PushProfileContract = z.object({
  instance: z.string().nullable().optional(),
}).openapi({
  title: 'PushProfile',
  description: 'Client profile snapshot',
});

// --- Preferences ---

export const PushPreferencesContract = z.object({
  instance: z.string().nullable().optional(),
}).openapi({
  title: 'PushPreferences',
  description: 'Topic preference update',
});

// --- Acknowledgment ---

export const PushAcknowledgmentContract = z.object({
  installationId: z.string().openapi({
    description: 'Installation identifier',
  }),
  instance: z.string().openapi({
    description: 'UnifiedPush instance identifier',
  }),
}).openapi({
  title: 'PushAcknowledgment',
  description: 'Acknowledgment response for mutation operations',
});

// --- Confirmation ---

export const PushConfirmContract = PushInstallationContract;
