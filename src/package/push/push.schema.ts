import { z } from 'zod';

/**
 * Runtime Zod schemas for the Push domain.
 *
 * These handle validation, coercion, and preprocessing.
 * Public OpenAPI contract schemas live in push.contract.ts.
 */

// --- Installation Registration ---

export const PushInstallationRegistrationSchema = z.object({
  installationId: z.string().min(1),
  instance: z.string().min(1).default('default'),
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  platform: z.enum(['ANDROID']).default('ANDROID'),
  appVersion: z.string().nullish().default(null),
  appCode: z.number().int().nonnegative().nullish().default(null),
  appBuild: z.string().nullish().default(null),
  locale: z.string().nullish().default(null),
  timezone: z.string().nullish().default(null),
  distributor: z.string().nullish().default(null),
  topics: z
    .array(z.enum(['NEWS', 'APP_ANNOUNCEMENTS', 'SYNC']))
    .default([]),
});

// --- Challenge Confirmation ---

export const PushChallengeConfirmSchema = z.object({
  instance: z.string().min(1).default('default'),
  token: z.string().min(1),
});

// --- Profile Update ---

export const PushProfileSchema = z.object({
  instance: z.string().min(1).default('default'),
  app: z
    .object({
      version: z.string().nullish().default(null),
      code: z.number().int().nonnegative().nullish().default(null),
      build: z.string().nullish().default(null),
      source: z.string().nullish().default(null),
    })
    .nullish()
    .default(null),
  device: z
    .object({
      platform: z.enum(['ANDROID']).nullish().default(null),
      sdk: z.number().int().nonnegative().nullish().default(null),
      manufacturer: z.string().nullish().default(null),
      model: z.string().nullish().default(null),
    })
    .nullish()
    .default(null),
  locale: z
    .object({
      language: z.string().nullish().default(null),
      region: z.string().nullish().default(null),
      timezone: z.string().nullish().default(null),
    })
    .nullish()
    .default(null),
  capabilities: z
    .object({
      unifiedPush: z.boolean().nullish().default(null),
      notificationRuntimePermission: z.boolean().nullish().default(null),
      supportsSilentSync: z.boolean().nullish().default(null),
      supportsRichNotifications: z.boolean().nullish().default(null),
    })
    .nullish()
    .default(null),
  views: z
    .object({
      lastSeen: z.string().nullish().default(null),
      lastSeenAt: z.number().finite().nullish().default(null),
    })
    .nullish()
    .default(null),
  topics: z
    .object({
      news: z.boolean().nullish().default(null),
      appAnnouncements: z.boolean().nullish().default(null),
      sync: z.boolean().nullish().default(null),
      airing: z.boolean().nullish().default(null),
      mediaUpdates: z.boolean().nullish().default(null),
    })
    .nullish()
    .default(null),
  identity: z
    .object({
      provider: z.enum(['ANILIST']).nullish().default(null),
      anilistUserId: z.number().int().positive().nullish().default(null),
      state: z.enum(['CLIENT_DECLARED']).nullish().default(null),
    })
    .nullish()
    .default(null),
});

// --- Topic Preferences ---

export const PushPreferencesSchema = z.object({
  instance: z.string().min(1).default('default'),
  topics: z.object({
    news: z.boolean().nullish().default(null),
    appAnnouncements: z.boolean().nullish().default(null),
    sync: z.boolean().nullish().default(null),
    airing: z.boolean().nullish().default(null),
    mediaUpdates: z.boolean().nullish().default(null),
  }),
});

// --- Installation Deletion ---

export const PushDeleteSchema = z.object({
  instance: z.string().min(1).default('default'),
  reason: z.string().nullish().default(null),
});

// --- VAPID Response ---

export const PushVapidResponseSchema = z.object({
  applicationServerKey: z.string(),
});
