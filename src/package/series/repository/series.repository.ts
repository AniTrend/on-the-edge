import type { Collection } from '@scope/database/collection';
import type { SeriesDocument } from './series.document.ts';
import type { SeriesQuery } from '../series.types.ts';
import { LoggerService } from '@scope/logger';
import { Injectable } from '@danet/core';
import { MongoService } from '@scope/database';
import { MongoCollectionAdapter } from '@scope/database/collection';
import { buildSeriesKey, load, persist } from './helpers/index.ts';
import { SeriesResolver } from './series.resolver.ts';
import { WithId } from 'mongodb';

/**
 * Repository for series metadata with 48h caching
 *
 * Orchestrates multi-source data aggregation (Trakt, TMDB, Skyhook, Notify,
 * Jikan, ARM, TheXem) and persists canonical MediaUnion to MongoDB.
 *
 * Cache TTL: 48 hours for all series
 */
@Injectable()
export class SeriesRepository {
  private readonly COLLECTION_NAME = 'series';

  constructor(
    private readonly mongo: MongoService,
    private readonly logger: LoggerService,
    private readonly resolver: SeriesResolver,
  ) {}

  private get collection(): Collection<SeriesDocument> {
    return new MongoCollectionAdapter(
      this.mongo.collection<SeriesDocument>(this.COLLECTION_NAME),
    );
  }

  /**
   * Invoke series aggregation with caching
   *
   * @param query Series lookup parameters
   *
   * @returns Aggregated and cached series document
   */
  async invoke(query: SeriesQuery): Promise<WithId<SeriesDocument>> {
    const seriesKey = buildSeriesKey(query);

    // Check cache
    const cached = await load(this.collection, seriesKey);
    if (cached) {
      this.logger.instance.debug('Series cache hit', { seriesKey });
      return cached;
    }
    this.logger.instance.debug('Series cache stale, re-aggregating', {
      seriesKey,
    });

    const aggregated = await this.resolver.resolve(query);

    // Persist to cache (adds seriesKey and updatedAt)
    const persisted = await persist(this.collection, seriesKey, aggregated);

    if (!persisted) {
      throw new Error(`Failed to persist series for ${seriesKey}`);
    }

    return persisted;
  }
}
