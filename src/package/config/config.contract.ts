/**
 * Public OpenAPI contract schemas for the Config domain.
 *
 * These schemas define the stable, named OpenAPI components that
 * GraphQL Mesh consumes. They are separate from runtime/domain
 * validation schemas because public contracts must be explicit,
 * named, and serializable.
 *
 * Runtime schemas may use coercion, preprocessors, and internal
 * provider types. Public contracts must be OpenAPI-friendly.
 */

import { z } from '@scope/common/openapi';

export const ConfigSettingsContract = z.object({
  analyticsEnabled: z.boolean(),
  platformSource: z.string().url().optional(),
}).openapi({
  title: 'ConfigSettings',
  description: 'Application settings configuration',
});

export const ConfigImageContract = z.object({
  banner: z.string().url(),
  poster: z.string().url(),
  loading: z.string().url(),
  error: z.string().url(),
  info: z.string().url(),
  default: z.string().url(),
}).openapi({
  title: 'ConfigImage',
  description: 'Image URL configuration for the client',
});

export const ConfigNavigationGroupContract = z.object({
  authenticated: z.boolean(),
  i18n: z.string(),
}).openapi({
  title: 'ConfigNavigationGroup',
  description: 'Navigation item group classification',
});

export const ConfigNavigationItemContract = z.object({
  key: z.string().min(1).openapi({
    description:
      'Stable identity for persistence, dedupe, and diffing. Must not change unless a deliberate migration is intended.',
  }),
  criteria: z.string(),
  destination: z.string(),
  i18n: z.string(),
  icon: z.string(),
  group: ConfigNavigationGroupContract,
}).openapi({
  title: 'ConfigNavigationItem',
  description: 'A single navigation entry',
});

export const ConfigGenreContract = z.object({
  name: z.string(),
  mediaId: z.number().min(1),
}).openapi({
  title: 'ConfigGenre',
  description: 'Genre entry linked to a media entity',
});

export const PromotionActionContract = z.object({
  type: z.literal('OPEN_URL'),
  url: z.string().url(),
}).openapi({
  title: 'PromotionAction',
  description: 'Action attached to a promotion payload',
});

export const PromotionContract = z.object({
  id: z.string(),
  targetProduct: z.enum(['ANITREND_V2']).openapi({
    title: 'PromotionTargetProduct',
    description: 'Product the promotion is intended for',
  }),
  title: z.string(),
  message: z.string(),
  action: PromotionActionContract,
}).openapi({
  title: 'Promotion',
  description: 'Promotion payload for eligible clients',
});

export const ConfigContract = z.object({
  id: z.string(),
  settings: ConfigSettingsContract,
  image: ConfigImageContract,
  navigation: z.array(ConfigNavigationItemContract).default([]),
  genres: z.array(ConfigGenreContract).default([]),
  promotion: PromotionContract.nullable().optional(),
}).openapi({
  title: 'Config',
  description: 'Client configuration',
});
