import type { EpisodeDocument } from '../../episodes.document.ts';
import type { EpisodesResolver } from '../episodes.resolver.ts';
import type { Collection } from '@scope/database/collection';
import { currentDate, toInstant } from '@scope/common/utils';
import { deriveAiringStatus } from './scope.ts';
import type { MergedEpisode } from '../../episodes.types.ts';

/**
 * @deprecated Use Temporal API when stable
 *
 * Check if a timestamp is older than threshold hours
 * @param currentDateStr Current date string (RFC 822 format)
 * @param updatedAt Timestamp in epoch seconds
 * @param thresholdHours Age threshold in hours
 * @returns True if older than threshold
 */
function isOlderThan(
  currentDateStr: string,
  updatedAt: number,
  thresholdHours: number,
): boolean {
  const now = toInstant(currentDateStr);
  const ageInHours = (now - updatedAt) / 3600;
  return ageInHours > thresholdHours;
}

/**
 * Load episode document from cache if fresh
 * TTL: 12 hours for airing shows, 7 days (168 hours) for completed
 *
 * @param collection MongoDB collection interface
 * @param seriesKey Series identifier
 * @returns Cached document if fresh, undefined otherwise
 */
export async function load(
  collection: Collection<EpisodeDocument>,
  seriesKey: string,
): Promise<EpisodeDocument | undefined> {
  const document = await collection.findOne({ seriesKey });
  if (document) {
    // TODO: Use Temporal API when stable
    let refreshThreshold = 24 * 7; // 7 days default
    if (document.airing === true) {
      refreshThreshold = 12; // 12 hours for airing shows
    }
    if (!isOlderThan(currentDate(), document.updatedAt, refreshThreshold)) {
      return document;
    }
  }
  return undefined;
}

/**
 * Persist episode document to collection
 *
 * @param collection MongoDB collection interface
 * @param seriesKey Series identifier
 * @param airing Whether the show is currently airing
 * @param episodes Episode data to store (with merge metadata)
 * @returns Saved document with _id
 */
export async function persist(
  collection: Collection<EpisodeDocument>,
  seriesKey: string,
  airing: boolean,
  episodes: MergedEpisode[],
  stats?: {
    total: number;
    sources: string[];
    conflicts: number;
    orphans: number;
    remapped: number;
    perSourceCounts?: Partial<Record<string, number>>;
    remapSources?: string[];
    unmatchedBySource?: Partial<Record<string, number>>;
    seasonMismatches?: number;
  },
  titleSimThreshold?: number | null,
): Promise<EpisodeDocument> {
  const document: EpisodeDocument = {
    seriesKey,
    airing,
    updatedAt: toInstant(currentDate()),
    episodes,
    stats,
    titleSimThreshold: titleSimThreshold ?? null,
  };
  const result = await collection.findOneAndReplace(
    { seriesKey },
    document,
    { upsert: true },
  );
  if (!result) {
    throw new Error(`Failed to persist episodes for seriesKey=${seriesKey}`);
  }
  return result as EpisodeDocument;
}

/**
 * Fetch and merge episodes from resolver (multi-source)
 *
 * @param resolver Episodes resolver instance
 * @param seriesKey Series identifier (for logging)
 * @param malId MyAnimeList ID
 * @returns Episodes and airing status
 */
export async function fetchCanonical(
  resolver: EpisodesResolver,
  seriesKey: string,
  malId: number,
  includeOrphans = false,
): Promise<{
  airing: boolean;
  episodes: MergedEpisode[];
  stats: {
    total: number;
    sources: string[];
    conflicts: number;
    orphans: number;
    remapped: number;
    perSourceCounts?: Partial<Record<string, number>>;
    remapSources?: string[];
    unmatchedBySource?: Partial<Record<string, number>>;
    seasonMismatches?: number;
  };
  titleSimThreshold: number | null;
}> {
  const result = await resolver.resolve(malId, seriesKey, includeOrphans);

  if (!result.episodes || result.episodes.length === 0) {
    throw new Error(
      `Failed to fetch episodes for seriesKey=${seriesKey}, malId=${malId}`,
    );
  }

  // Derive airing status from episode air dates
  const airing = deriveAiringStatus(result.episodes);

  return {
    airing,
    episodes: result.episodes,
    stats: result.stats,
    titleSimThreshold: result.titleSimThreshold ?? null,
  };
}
