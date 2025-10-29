import type { Collection } from '@scope/database/collection';
import { currentDate, currentInstant, toInstant } from '@scope/common/utils';
import type { SeriesDocument } from '../series.document.ts';
import { MediaUnion, SeriesQuery } from '../../series.types.ts';
import { WithId } from 'mongodb';

/**
 * TTL threshold for series cache: 48 hours
 */
const SERIES_TTL_HOURS = 48;

/**
 * Build a stable cache key for series lookup
 */
export function buildSeriesKey(query: SeriesQuery): string {
  return Object.entries(query)
    .map(([key, value]) => `${key}:${value}`)
    .sort()
    .join('|');
}

/**
 * Load series from cache if present and fresh
 * TTL: 48 hours for all series
 *
 * @param collection MongoDB collection for series
 * @param seriesKey Stable cache key
 *
 * @returns Cached series or null if stale/missing
 */
export async function load(
  collection: Collection<SeriesDocument>,
  seriesKey: string,
): Promise<WithId<SeriesDocument> | null> {
  const document = await collection.findOne({ seriesKey });
  if (!document) {
    return null;
  }

  const updatedAtInstant = Temporal.Instant.fromEpochMilliseconds(
    document.updatedAt * 1000,
  );
  const duration = currentInstant().until(updatedAtInstant, {
    largestUnit: 'hours',
  });

  if (duration.hours < SERIES_TTL_HOURS) {
    return document;
  }

  return null;
}

/**
 * Persist aggregated series data to cache with current timestamp
 *
 * @param collection MongoDB collection for series
 * @param seriesKey Stable cache key
 * @param series Aggregated series data (MediaUnion)
 */
export async function persist(
  collection: Collection<SeriesDocument>,
  seriesKey: string,
  series: MediaUnion,
): Promise<WithId<SeriesDocument> | null> {
  const now = toInstant(currentDate());
  const doc: SeriesDocument = {
    ...series,
    seriesKey,
    updatedAt: now,
  };

  return await collection.findOneAndReplace(
    { seriesKey },
    doc,
    { upsert: true },
  );
}
