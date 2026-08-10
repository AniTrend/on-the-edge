import { z } from 'zod';

export const UpdateProductSchema = z.enum(['ANITREND_APP', 'ANITREND_V2']);
export const UpdateChannelSchema = z.enum(['STABLE', 'BETA', 'EXPERIMENTAL']);

export const UpdateReleaseAssetSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  size: z.number().int().nonnegative().nullish(),
  contentType: z.string().nullish(),
  digest: z.string().nullish(),
});

/**
 * Cached release record for a (product, channel) source, backed by
 * GitHub Releases metadata plus tagged gradle/version.properties (with
 * a strict semver fallback on the release tag). No version.json fields
 * are involved.
 */
export const UpdateReleaseSchema = z.object({
  product: UpdateProductSchema,
  channel: UpdateChannelSchema,
  tag: z.string().min(1),
  name: z.string().min(1),
  releaseNotes: z.string().nullish(),
  publishedAt: z.number().finite(),
  prerelease: z.boolean(),
  htmlUrl: z.string().url(),
  assets: z.array(UpdateReleaseAssetSchema),
  code: z.number().int().positive(),
  version: z.string().min(1),
});

/**
 * Persisted update record: release plus the fetch time used for
 * staleness evaluation and the GitHub ETag used for conditional
 * revalidation.
 */
export const UpdateRecordSchema = UpdateReleaseSchema.extend({
  updatedAt: z.number().finite(),
  etag: z.string().nullish(),
});

/** Default release channel when the update query omits `channel`. */
export const DEFAULT_UPDATE_CHANNEL = 'STABLE' as const;

/**
 * Default product served by the public endpoint when the update query
 * omits `product`. ANITREND_V2 is the current primary consumer.
 */
export const DEFAULT_UPDATE_PRODUCT = 'ANITREND_V2' as const;

/**
 * Query parameters for the cached update lookup. Strict: unknown
 * parameters are rejected, mirroring the news query schema.
 */
export const UpdateQuerySchema = z.object({
  product: UpdateProductSchema.default(DEFAULT_UPDATE_PRODUCT),
  channel: UpdateChannelSchema.default(DEFAULT_UPDATE_CHANNEL),
}).strict();
