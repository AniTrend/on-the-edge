import { z } from 'zod';

/**
 * Remote version.json payload served by a GitHub update source,
 * matching the observed AniTrend app manifest fields exactly:
 * code, version, migration, minSdk, releaseNotes, appId.
 *
 * Unknown extra fields are tolerated and stripped (default zod object
 * behavior). `migration` accepts both a boolean flag and a version
 * string form; the persisted record preserves whichever the source
 * declares. `channel` is intentionally NOT part of the manifest: the
 * edge assigns the authoritative channel from the source mapping.
 */
export const GithubVersionJsonSchema = z.object({
  code: z.number().int().positive(),
  version: z.string().min(1),
  migration: z.union([z.boolean(), z.string().min(1)]).nullish(),
  minSdk: z.number().int().nonnegative(),
  releaseNotes: z.string().nullish(),
  appId: z.string().min(1),
});
