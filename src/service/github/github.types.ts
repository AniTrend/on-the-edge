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
 * (undefined when no release qualifies) and the response ETag for
 * conditional requests. `not-modified` signals a 304: the previously
 * fetched content is still current.
 */
export type GithubReleaseOutcome =
  | {
    status: 'ok';
    release: GithubRelease | undefined;
    etag: string | undefined;
  }
  | { status: 'not-modified' };
