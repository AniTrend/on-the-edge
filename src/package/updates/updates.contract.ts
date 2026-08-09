/**
 * Public OpenAPI contract schemas for the Updates domain.
 *
 * These schemas define the stable, named OpenAPI components that
 * GraphQL Mesh consumes. They mirror the observed AniTrend app
 * version.json manifest fields (code, version, migration, minSdk,
 * releaseNotes, appId) plus the edge-assigned channel and the
 * `updatedAt` cache freshness metadata. No invented download or
 * publication fields are exposed.
 */

import { z } from '@scope/common/openapi';

export const UpdateChannelContract = z.enum([
  'STABLE',
  'BETA',
  'EXPERIMENTAL',
]).openapi({
  title: 'UpdateChannel',
  description: 'Release channel of the cached update record',
});

export const UpdateReleaseContract = z.object({
  channel: UpdateChannelContract,
  code: z.number().int().positive().openapi({
    description: 'App version code from the AniTrend version.json manifest',
  }),
  version: z.string().min(1).openapi({
    description: 'App version name from the AniTrend version.json manifest',
  }),
  migration: z.union([z.boolean(), z.string().min(1)]).optional().openapi({
    description:
      'Migration marker declared by the manifest, boolean or version string; absent when the manifest omits it',
  }),
  minSdk: z.number().int().nonnegative().openapi({
    description: 'Minimum Android SDK level required by this release',
  }),
  releaseNotes: z.string().nullable().optional().openapi({
    description: 'Release notes from the AniTrend version.json manifest',
  }),
  appId: z.string().min(1).openapi({
    description:
      'Application identifier from the AniTrend version.json manifest',
  }),
  updatedAt: z.number().finite().openapi({
    description:
      'Epoch milliseconds when the edge last refreshed this cached update',
  }),
}).openapi({
  title: 'UpdateRelease',
  description:
    'Cached update release for a channel, sourced from the AniTrend app version.json manifest',
});
