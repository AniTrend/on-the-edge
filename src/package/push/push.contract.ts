/**
 * Public OpenAPI contract schemas for the Push domain.
 *
 * These define the stable public API surface consumed by
 * clients (Android app) and edge-graphql (GraphQL Mesh).
 *
 * Every public nested request object and enum carries a unique
 * semantic PascalCase `.openapi({ title })` so the generated
 * document promotes them to named components instead of inline
 * path-derived GraphQL names (e.g. `mutationInput_updateProfile_input_*`).
 *
 * Runtime validation semantics (defaults, requiredness, nullability,
 * constraints, enum members) are canonical here; push.schema.ts
 * aliases these contracts as the runtime input schemas.
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

// --- Registration Request ---

export const PushRegistrationKeysContract = z.object({
  p256dh: z.string().min(1),
  auth: z.string().min(1),
}).openapi({
  title: 'PushRegistrationKeys',
  description: 'Web Push subscription keys for the installation',
});

export const PushRegistrationPlatformContract = z.enum(['ANDROID']).openapi({
  title: 'PushRegistrationPlatform',
  description: 'Client platform for the installation',
});

export const PushRegistrationTopicContract = z.enum([
  'NEWS',
  'APP_ANNOUNCEMENTS',
  'SYNC',
]).openapi({
  title: 'PushRegistrationTopic',
  description: 'Topic subscription for the installation',
});

export const PushRegistrationBodyContract = z.object({
  installationId: z.string().min(1),
  instance: z.string().min(1).default('default'),
  endpoint: z.string().url(),
  keys: PushRegistrationKeysContract,
  platform: PushRegistrationPlatformContract.default('ANDROID'),
  appVersion: z.string().nullable().optional().default(null),
  appCode: z.number().int().nonnegative().nullable().optional().default(null),
  appBuild: z.string().nullable().optional().default(null),
  locale: z.string().nullable().optional().default(null),
  timezone: z.string().nullable().optional().default(null),
  distributor: z.string().nullable().optional().default(null),
  topics: z.array(PushRegistrationTopicContract).default([]),
}).openapi({
  title: 'PushRegistrationBody',
  description: 'Installation registration request body',
});

// --- Confirmation Request ---

export const PushConfirmBodyContract = z.object({
  instance: z.string().min(1).default('default'),
  token: z.string().min(1),
}).openapi({
  title: 'PushConfirmBody',
  description: 'Challenge confirmation request body',
});

// --- Profile Update Request ---

export const PushProfileAppContract = z.object({
  version: z.string().nullable().optional().default(null),
  code: z.number().int().nonnegative().nullable().optional().default(null),
  build: z.string().nullable().optional().default(null),
  source: z.string().nullable().optional().default(null),
}).openapi({
  title: 'PushProfileApp',
  description: 'Application build metadata for the profile',
});

export const PushProfileDevicePlatformContract = z.enum(['ANDROID']).openapi({
  title: 'PushProfileDevicePlatform',
  description: 'Device platform for the profile',
});

export const PushProfileDeviceContract = z.object({
  platform: PushProfileDevicePlatformContract.nullable().optional().default(
    null,
  ),
  sdk: z.number().int().nonnegative().nullable().optional().default(null),
  manufacturer: z.string().nullable().optional().default(null),
  model: z.string().nullable().optional().default(null),
}).openapi({
  title: 'PushProfileDevice',
  description: 'Device hardware and SDK metadata for the profile',
});

export const PushProfileLocaleContract = z.object({
  language: z.string().nullable().optional().default(null),
  region: z.string().nullable().optional().default(null),
  timezone: z.string().nullable().optional().default(null),
}).openapi({
  title: 'PushProfileLocale',
  description: 'Locale and timezone for the profile',
});

export const PushProfileCapabilitiesContract = z.object({
  unifiedPush: z.boolean().nullable().optional().default(null),
  notificationRuntimePermission: z.boolean().nullable().optional().default(
    null,
  ),
  supportsSilentSync: z.boolean().nullable().optional().default(null),
  supportsRichNotifications: z.boolean().nullable().optional().default(null),
}).openapi({
  title: 'PushProfileCapabilities',
  description: 'Push capability flags for the profile',
});

export const PushProfileViewsContract = z.object({
  lastSeen: z.string().nullable().optional().default(null),
  lastSeenAt: z.number().finite().nullable().optional().default(null),
}).openapi({
  title: 'PushProfileViews',
  description: 'Last view state for the profile',
});

export const PushProfileTopicsContract = z.object({
  news: z.boolean().nullable().optional().default(null),
  appAnnouncements: z.boolean().nullable().optional().default(null),
  sync: z.boolean().nullable().optional().default(null),
  airing: z.boolean().nullable().optional().default(null),
  mediaUpdates: z.boolean().nullable().optional().default(null),
}).openapi({
  title: 'PushProfileTopics',
  description: 'Topic preference flags for the profile',
});

export const PushProfileIdentityProviderContract = z.enum(['ANILIST']).openapi({
  title: 'PushProfileIdentityProvider',
  description: 'Identity provider for the profile',
});

export const PushProfileIdentityStateContract = z.enum(['CLIENT_DECLARED'])
  .openapi({
    title: 'PushProfileIdentityState',
    description: 'Declaration state of the profile identity',
  });

export const PushProfileIdentityContract = z.object({
  provider: PushProfileIdentityProviderContract.nullable().optional().default(
    null,
  ),
  anilistUserId: z.number().int().positive().nullable().optional().default(
    null,
  ),
  state: PushProfileIdentityStateContract.nullable().optional().default(null),
}).openapi({
  title: 'PushProfileIdentity',
  description: 'Identity provider linkage for the profile',
});

export const PushProfileBodyContract = z.object({
  instance: z.string().min(1).default('default'),
  app: PushProfileAppContract.nullable().optional().default(null),
  device: PushProfileDeviceContract.nullable().optional().default(null),
  locale: PushProfileLocaleContract.nullable().optional().default(null),
  capabilities: PushProfileCapabilitiesContract.nullable().optional().default(
    null,
  ),
  views: PushProfileViewsContract.nullable().optional().default(null),
  topics: PushProfileTopicsContract.nullable().optional().default(null),
  identity: PushProfileIdentityContract.nullable().optional().default(null),
}).openapi({
  title: 'PushProfileBody',
  description: 'Profile update request body',
});

// --- Topic Preferences Request ---

export const PushPreferencesTopicsContract = z.object({
  news: z.boolean().nullable().optional().default(null),
  appAnnouncements: z.boolean().nullable().optional().default(null),
  sync: z.boolean().nullable().optional().default(null),
  airing: z.boolean().nullable().optional().default(null),
  mediaUpdates: z.boolean().nullable().optional().default(null),
}).openapi({
  title: 'PushPreferencesTopics',
  description: 'Topic preference flags for the installation',
});

export const PushPreferencesBodyContract = z.object({
  instance: z.string().min(1).default('default'),
  topics: PushPreferencesTopicsContract,
}).openapi({
  title: 'PushPreferencesBody',
  description: 'Topic preferences update request body',
});

// --- Installation Deletion Request ---

export const PushDeleteBodyContract = z.object({
  instance: z.string().min(1).default('default'),
  reason: z.string().nullable().optional().default(null),
}).openapi({
  title: 'PushDeleteBody',
  description: 'Installation deletion request body',
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
