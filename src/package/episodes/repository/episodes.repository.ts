import { Injectable } from '@danet/core';
import type { Collection } from '@scope/database/collection';
import { MongoService } from '@scope/database';
import { MongoCollectionAdapter } from '@scope/database/collection';
import { LoggerService } from '@scope/logger';
import type {
  EpisodeFilters,
  EpisodesContainer,
  EpisodesDataResponse,
} from '../episodes.types.ts';
import type { EpisodeDocument } from '../episodes.document.ts';
import { EpisodesResolver } from './episodes.resolver.ts';
import {
  applyFilters,
  buildFilterHash,
  cursors,
  fetchCanonical,
  load,
  paginate,
  persist,
} from './helpers/index.ts';
import { EntityCursor } from '@scope/database';

/**
 * Episodes repository implementing cursor-based pagination with TTL caching.
 *
 * Caching strategy:
 * - Airing shows: 12-hour TTL
 * - Completed shows: 7-day (168-hour) TTL
 *
 * Data source:
 * - Primary: Jikan API (MyAnimeList)
 * - Future: Multi-source enrichment (Skyhook, TMDB, Trakt)
 *
 * Pagination:
 * - Cursor-based (opaque, stable)
 * - Filter hash validation (cursors invalidated when filters change)
 * - Forward (after) and backward (before) navigation
 */
@Injectable()
export class EpisodesRepository {
  constructor(
    private readonly mongo: MongoService,
    private readonly resolver: EpisodesResolver,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get MongoDB collection adapter (lazy initialization).
   */
  private get collection(): Collection<EpisodeDocument> {
    const mongoCollection = this.mongo.collection<EpisodeDocument>('episodes');
    return new MongoCollectionAdapter(mongoCollection);
  }

  /**
   * Fetch episodes for a series with caching and pagination.
   *
   * @param malId MyAnimeList series ID
   * @param opts Pagination and filter options
   * @returns Paginated episodes response with cursors
   */
  async invoke(
    malId: number,
    opts: {
      after?: EntityCursor;
      before?: EntityCursor;
      limit: number;
      filters?: EpisodeFilters;
    },
  ): Promise<EpisodesDataResponse> {
    const seriesKey = String(malId);
    const hash = buildFilterHash(seriesKey, opts.filters);

    // Try loading from cache
    let document = await load(this.collection, seriesKey);
    // Track diagnostics inputs (populated on fresh fetch)
    let titleSimThreshold: number | null = null;
    let xemRemapped = 0;

    // Cache miss or stale: fetch fresh data
    if (!document) {
      this.logger.instance.debug('Cache miss, resolving from sources', {
        seriesKey,
        malId,
      });

      const {
        airing,
        episodes,
        stats: _stats,
        titleSimThreshold: _titleSimThreshold,
      } = await fetchCanonical(
        this.resolver,
        seriesKey,
        malId,
      );

      // Persist to cache
      document = await persist(
        this.collection,
        seriesKey,
        airing ?? false,
        episodes,
        _stats,
        _titleSimThreshold,
      );
      titleSimThreshold = _titleSimThreshold;
      xemRemapped = _stats.remapped ?? 0;
    }

    // Apply filters to cached episodes
    const filtered = applyFilters(document.episodes, opts.filters);

    // Paginate filtered results
    const page = paginate(filtered, {
      after: opts.after,
      before: opts.before,
      limit: opts.limit,
      hash,
    });

    // Strip merge metadata before returning (API should return EpisodeCanonical[])
    const canonical = page.data.map((ep) => {
      // Remove merge-specific fields by destructuring and reconstructing
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {
        sources: _sources,
        conflictReasons: _conflictReasons,
        alignmentKey: _alignmentKey,
        ...rest
      } = ep;
      return rest;
    });

    // Generate cursors for navigation
    const { first, last } = cursors(
      hash,
      page.firstPos,
      page.lastPos,
      page.data.length,
    );

    const base: EpisodesContainer = {
      data: canonical,
      first: first ?? null,
      last: last ?? null,
      count: page.data.length,
      total: filtered.length,
    };

    // Always include diagnostics built from persisted metadata
    const sources = Array.from(
      new Set(document.episodes.flatMap((e) => e.sources)),
    ).map(String);
    return {
      ...base,
      diagnostics: {
        sources,
        mergeStats: {
          xemRemapped: document.stats?.remapped ?? xemRemapped,
          titleSimThreshold: document.titleSimThreshold ?? titleSimThreshold ??
            null,
          perSourceCounts: document.stats?.perSourceCounts,
          remapSources: document.stats?.remapSources,
        },
        cached: true,
        updatedAt: document.updatedAt,
      },
    } satisfies EpisodesDataResponse;
  }
}
