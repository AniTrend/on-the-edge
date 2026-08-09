import type { GithubVersionJson } from '@scope/service/github';
import type { UpdateChannel, UpdateRecord } from './updates.types.ts';

/**
 * Map a validated remote version.json payload onto a persisted update
 * record. The channel is taken from the source mapping, not from the
 * payload, so a misconfigured source cannot stamp the wrong channel.
 * Manifest fields are preserved as-is; no invented fields are added.
 *
 * `migration` is omitted when null/absent: the public contract is an
 * optional non-null boolean|string union, so null is never persisted
 * by fresh transforms.
 */
export const transform = (
  source: GithubVersionJson,
  channel: UpdateChannel,
): UpdateRecord => {
  const record: UpdateRecord = {
    channel,
    code: source.code,
    version: source.version,
    minSdk: source.minSdk,
    releaseNotes: source.releaseNotes ?? null,
    appId: source.appId,
    updatedAt: Date.now(),
  };
  if (source.migration !== undefined && source.migration !== null) {
    record.migration = source.migration;
  }
  return record;
};
