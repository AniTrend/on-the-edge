import type { GithubRelease, GithubReleaseAsset } from '@scope/service/github';
import type {
  UpdateChannel,
  UpdateProduct,
  UpdateRecord,
} from './updates.types.ts';

export interface ReleaseTransformInput {
  product: UpdateProduct;
  channel: UpdateChannel;
  release: GithubRelease;
  version: string;
  code: number;
  etag?: string;
  /** Configured asset-name filter; absent or empty keeps all assets. */
  assetFilter?: string[];
}

/**
 * Map a validated GitHub release plus resolved version/code onto a
 * persisted update record. The product and channel come from the
 * source configuration, not from the payload, so a misconfigured
 * source cannot stamp the wrong identity. When the source config lists
 * asset names, only matching assets are persisted.
 */
export const transform = (input: ReleaseTransformInput): UpdateRecord => {
  const releaseName = input.release.name?.trim();
  const assetFilter = input.assetFilter ?? [];
  const assets = assetFilter.length > 0
    ? input.release.assets.filter((asset: GithubReleaseAsset) =>
      assetFilter.includes(asset.name)
    )
    : input.release.assets;
  return {
    product: input.product,
    channel: input.channel,
    tag: input.release.tagName,
    name: releaseName ? releaseName : input.release.tagName,
    releaseNotes: input.release.body ?? null,
    publishedAt: input.release.publishedAt,
    prerelease: input.release.prerelease,
    htmlUrl: input.release.htmlUrl,
    assets,
    code: input.code,
    version: input.version,
    updatedAt: Date.now(),
    etag: input.etag ?? null,
  };
};
