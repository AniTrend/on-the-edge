import { z } from 'zod';

const publishedAtFromIso = z.preprocess(
  (value) => (typeof value === 'string' ? Date.parse(value) : value),
  z.number().finite(),
);

export const GithubReleaseAssetPayloadSchema = z.object({
  name: z.string().min(1),
  browser_download_url: z.string().url(),
  size: z.number().int().nonnegative().nullish(),
});

/**
 * Raw GitHub REST release payload (snake_case API keys).
 * `published_at` is converted from the API's ISO 8601 string to epoch
 * milliseconds. Unknown extra fields are tolerated and stripped.
 */
export const GithubReleasePayloadSchema = z.object({
  tag_name: z.string().min(1),
  name: z.string().nullish(),
  body: z.string().nullish(),
  published_at: publishedAtFromIso,
  prerelease: z.boolean(),
  draft: z.boolean(),
  html_url: z.string().url(),
  assets: z.array(GithubReleaseAssetPayloadSchema).default([]),
});
