import { z } from 'zod';

export const UpdateChannelSchema = z.enum(['STABLE', 'BETA', 'EXPERIMENTAL']);

/**
 * Cached update release for a single channel. Deliberately mirrors the
 * observed AniTrend app version.json fields (code, version, migration,
 * minSdk, releaseNotes, appId) plus the edge-assigned channel. No
 * invented fields (url, publishedAt) unless source/consumer evidence
 * requires them.
 *
 * `migration` is optional and non-null: the public OpenAPI contract
 * cannot express a nullable boolean|string union (the generator emits
 * an invalid null-only type array), so null migration is omitted
 * rather than serialized.
 */
export const UpdateReleaseSchema = z.object({
  channel: UpdateChannelSchema,
  code: z.number().int().positive(),
  version: z.string().min(1),
  migration: z.union([z.boolean(), z.string().min(1)]).optional(),
  minSdk: z.number().int().nonnegative(),
  releaseNotes: z.string().nullish(),
  appId: z.string().min(1),
});

/**
 * Persisted update record: release plus the fetch time used for
 * staleness evaluation.
 */
export const UpdateRecordSchema = UpdateReleaseSchema.extend({
  updatedAt: z.number().finite(),
});

/** Default release channel when the update query omits `channel`. */
export const DEFAULT_UPDATE_CHANNEL = 'STABLE' as const;

/**
 * Query parameters for the cached update lookup. Strict: unknown
 * parameters are rejected, mirroring the news query schema.
 */
export const UpdateQuerySchema = z.object({
  channel: UpdateChannelSchema.default(DEFAULT_UPDATE_CHANNEL),
}).strict();
