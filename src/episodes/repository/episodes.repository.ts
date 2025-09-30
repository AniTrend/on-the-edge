import type { Features } from '@scope/common/types';
import type { EpisodeCollection } from '../collection/episode.collection.ts';
import { buildFilterHash } from './helpers/cursor.ts';
import {
  EpisodeCanonical,
  EpisodeCursor,
  EpisodesDataResponse,
} from '../episodes.types.ts';
import { mergeEpisodes } from '../aggregator/merge.ts';
import {
  getTitleSimThreshold,
  isXemNormalizationEnabled,
} from '@scope/common/experiment';
import {
  getAniListRelationId,
  type SeriesRelationId,
} from '@scope/service/arm';
import { logMergeStats } from './helpers/stats.ts';
import { fetchCanonical, load, persist } from './helpers/loader.ts';
import { deriveSeasonScope } from '../helpers/scope.ts';
import {
  getNotifyEpisodeSliceByCanonical,
  getSkyhookSliceAlignedToScope,
  getTmdbSliceByCanonical,
  getTmdbSliceForScope,
} from '../helpers/sources.ts';
import { getSkyhookShow } from '@scope/service/skyhook';
import { applyFilters } from './helpers/filters.ts';
import { cursors, paginate } from './helpers/paginate.ts';
import { logger } from '@scope/common/core';
import { getTraktSlice } from './helpers/sources.ts';
import { MergeResult } from '../aggregator/types.ts';

export class EpisodesRepository {
  constructor(
    private readonly collection: EpisodeCollection,
    private readonly features: Features,
  ) {}

  async invoke(
    id: number,
    opts: {
      after?: EpisodeCursor;
      before?: EpisodeCursor;
      limit: number;
      filters?: {
        kind?: string;
        specialsOnly?: boolean;
        start?: number;
        end?: number;
      };
      relation?: SeriesRelationId;
    },
  ): Promise<EpisodesDataResponse> {
    const seriesKey = String(id);
    const hash = buildFilterHash(seriesKey, opts.filters);
    let document = await load(this.collection, seriesKey);

    if (!document) {
      let mergeResult: MergeResult | undefined = undefined;
      let xemRemapped: number = 0;
      const malId = opts.relation?.myanimelist ?? id; // fallback to provided id for tests/local calls
      const { airing, episodes } = await fetchCanonical(seriesKey, malId);

      // Phase A: aggregate single-source (JIKAN) before slicing to keep paging consistent with future multi-source merges.
      // Optionally enrich JIKAN durations from TMDB (first season heuristics)
      //const { episodes } = document;
      const slices: {
        source: 'JIKAN' | 'SKYHOOK' | 'TMDB' | 'TRAKT' | 'NOTIFY' | 'THEMES';
        episodes: EpisodeCanonical[];
      }[] = [{ source: 'JIKAN', episodes }];

      const titleSimThreshold: number | undefined = getTitleSimThreshold(
        this.features,
      );
      // Attempt to resolve relation via ARM if not provided, to enable provider orchestration in tests and runtime
      const relation = opts.relation ??
        await getAniListRelationId(malId).catch(() => undefined);

      if (relation) {
        const skyhookShow = relation.thetvdb
          ? await getSkyhookShow(relation.thetvdb).catch(() => undefined)
          : undefined;

        const { pairs: scopePairs, stats: scopeStats } = deriveSeasonScope(
          episodes,
          skyhookShow ?? null,
          titleSimThreshold,
        );

        logger.debug('series.episodes.scope.derive', {
          attempted: scopeStats.attempted,
          exact: scopeStats.exactMatches,
          fuzzy: scopeStats.fuzzyMatches,
        });

        const normalizeXem = isXemNormalizationEnabled(this.features);

        const skyhookSliceSource = getSkyhookSliceAlignedToScope({
          relation,
          skyhookShow,
          scopePairs,
          normalizeXem,
        });
        const tmdbSliceSource = scopePairs.length && skyhookShow
          ? getTmdbSliceForScope({
            relation,
            scopePairs,
            skyhookShow: skyhookShow ?? null,
          })
          : getTmdbSliceByCanonical({ relation, canonical: episodes });
        const notifySliceSource = relation?.notify
          ? getNotifyEpisodeSliceByCanonical({ relation, canonical: episodes })
          : Promise.resolve(null);
        const traktSliceSource = getTraktSlice(relation);

        const [
          skyhookSlice,
          tmdbSlice,
          notifySlice,
          trakt,
        ] = await Promise.all([
          skyhookSliceSource,
          tmdbSliceSource,
          notifySliceSource,
          traktSliceSource,
        ]);

        if (skyhookSlice.slice) slices.push(skyhookSlice.slice);
        if (tmdbSlice) slices.push(tmdbSlice);
        if (notifySlice) slices.push(notifySlice);
        if (trakt) slices.push(trakt);
        if (skyhookSlice.remapped) {
          xemRemapped = xemRemapped + skyhookSlice.remapped;
        }
      }

      mergeResult = mergeEpisodes(
        { preferRuntime: 'JIKAN', titleSimThreshold },
        slices,
      );

      logMergeStats(mergeResult.episodes, {
        titleSim: titleSimThreshold ?? null,
      }, xemRemapped);
      document = await persist(
        this.collection,
        seriesKey,
        airing ?? true,
        mergeResult,
      );
    }

    // Apply filters (Phase A minimal): kind, specialsOnly, range (start..end inclusive by episode number)
    const merged = applyFilters(document.episodes, opts.filters);

    const page = paginate(merged, {
      after: opts.after,
      before: opts.before,
      limit: opts.limit,
      hash,
    });
    const { first, last } = cursors(
      hash,
      page.firstPos,
      page.lastPos,
      page.data.length,
    );
    return {
      data: page.data,
      count: page.data.length,
      total: merged.length,
      first,
      last,
    };
  }
}
