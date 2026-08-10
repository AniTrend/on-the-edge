/**
 * Public OpenAPI contract schemas for the Updates domain.
 *
 * These schemas define the stable, named OpenAPI components that
 * GraphQL Mesh consumes. They mirror the internal release-backed
 * record: product, channel, tag, name, version, code, releaseNotes,
 * publishedAt, prerelease, htmlUrl, assets, and the `updatedAt` cache
 * freshness metadata. The version.json-shaped fields (migration,
 * minSdk, appId) are intentionally absent; download URLs live on the
 * asset list, not on a single invented downloadUrl field.
 */

import { z } from '@scope/common/openapi';

export const UpdateProductContract = z.enum([
  'ANITREND_APP',
  'ANITREND_V2',
]).openapi({
  title: 'UpdateProduct',
  description: 'Product the cached update belongs to',
});

export const UpdateChannelContract = z.enum([
  'STABLE',
  'BETA',
  'EXPERIMENTAL',
]).openapi({
  title: 'UpdateChannel',
  description: 'Release channel of the cached update record',
});

/**
 * Downloadable asset of a release. `digest` is the content digest
 * GitHub reports for the asset: clients may use it to validate the
 * downloaded bytes, but it does not replace package-signing identity.
 * Android clients must still verify the package signature before
 * install.
 */
export const UpdateReleaseAssetContract = z.object({
  name: z.string().min(1).openapi({
    description: 'File name of the release asset',
  }),
  url: z.string().url().openapi({
    description: 'Direct download URL of the release asset',
  }),
  size: z.number().int().nonnegative().nullable().optional().openapi({
    description: 'Asset size in bytes when reported by GitHub',
  }),
  contentType: z.string().nullable().optional().openapi({
    description: 'MIME content type of the asset as reported by GitHub',
  }),
  digest: z.string().nullable().optional().openapi({
    description:
      'GitHub asset digest; validates the downloaded content and does not replace Android package-signing verification',
  }),
}).openapi({
  title: 'UpdateReleaseAsset',
  description: 'Downloadable asset of a release',
});

export const UpdateReleaseContract = z.object({
  product: UpdateProductContract,
  channel: UpdateChannelContract,
  tag: z.string().min(1).openapi({
    description: 'GitHub release tag',
  }),
  name: z.string().min(1).openapi({
    description: 'Release name, falling back to the tag',
  }),
  version: z.string().min(1).openapi({
    description:
      'Version resolved from tagged version.properties or the semver tag',
  }),
  code: z.number().int().positive().openapi({
    description:
      'Version code resolved from tagged version.properties or the semver tag',
  }),
  releaseNotes: z.string().nullable().optional().openapi({
    description: 'Release body from GitHub',
  }),
  publishedAt: z.number().finite().openapi({
    description: 'Epoch milliseconds when the release was published',
  }),
  prerelease: z.boolean().openapi({
    description: 'Whether the release is a prerelease',
  }),
  htmlUrl: z.string().url().openapi({
    description: 'URL of the release on GitHub',
  }),
  assets: z.array(UpdateReleaseAssetContract).openapi({
    description:
      'Downloadable assets; filtered to the configured asset names when the source config lists them',
  }),
  updatedAt: z.number().finite().openapi({
    description:
      'Epoch milliseconds when the edge last refreshed this cached update',
  }),
}).openapi({
  title: 'UpdateRelease',
  description: 'Cached GitHub release for a product/channel source',
});
