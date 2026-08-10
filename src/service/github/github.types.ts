import { z } from 'zod';
import {
  GithubReleaseAssetPayloadSchema,
  GithubReleasePayloadSchema,
} from './github.schema.ts';

export type GithubReleasePayload = z.infer<typeof GithubReleasePayloadSchema>;
export type GithubReleaseAssetPayload = z.infer<
  typeof GithubReleaseAssetPayloadSchema
>;

/** Domain shape of a GitHub release, mapped from the REST payload. */
export interface GithubReleaseAsset {
  name: string;
  url: string;
  size: number | null | undefined;
  contentType?: string | null;
  digest?: string | null;
}

/** Snapshot of the GitHub REST API rate-limit response headers. */
export interface GithubRateLimit {
  limit: number;
  remaining: number;
  reset: number;
}

export interface GithubRelease {
  tagName: string;
  name: string | null | undefined;
  body: string | null | undefined;
  publishedAt: number;
  prerelease: boolean;
  draft: boolean;
  htmlUrl: string;
  assets: GithubReleaseAsset[];
}

export type GithubReleaseSelector = 'stable' | 'prerelease';

/**
 * Outcome of a GitHub release lookup. `ok` carries the selected release
 * (undefined when no release qualifies), the response ETag for
 * conditional requests, and the rate-limit snapshot when GitHub
 * reports one. `not-modified` signals a 304: the previously fetched
 * content is still current.
 */
export type GithubReleaseOutcome =
  | {
    status: 'ok';
    release: GithubRelease | undefined;
    etag: string | undefined;
    rateLimit?: GithubRateLimit;
  }
  | { status: 'not-modified' };
