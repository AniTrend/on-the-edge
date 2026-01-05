import { Injectable } from '@danet/core';
import { JikanService } from '@scope/service/jikan';
import { SkyhookService } from '@scope/service/skyhook';
import { TmdbService } from '@scope/service/tmdb';
import { TraktService } from '@scope/service/trakt';
import { NotifyService } from '@scope/service/notify';
import { ThemeService } from '@scope/service/theme';
import { TheXemService } from '@scope/service/thexem';
import { ArmService } from '@scope/service/arm';
import type { SeriesRelationId } from '@scope/service/arm';
import { LoggerService } from '@scope/logger';
import { ExperimentService } from '@scope/experiment';
import { toCanonicalEpisode } from '../transformer/canonical.ts';
import {
  type EpisodeSourceSlice,
  mergeEpisodes,
  type MergeResult,
} from '../aggregator/merge.ts';
import type { EpisodeCanonical } from '../episodes.types.ts';
import { toInstant } from '@scope/common/utils';

/**
 * Episodes resolver orchestrating multi-source episode data aggregation.
 *
 * Responsibilities:
 * - Fetch episode data from multiple sources (Jikan, Skyhook, TMDB, etc.)
 * - Merge episodes using Dice coefficient title matching
 * - Normalize episode numbering via TheXem
 * - Enrich with themes from AnimeThemes
 *
 * Architecture:
 * - Injectable service with all external service dependencies
 * - Called by EpisodesRepository after cache miss
 * - Returns canonical merged episodes ready for persistence
 *
 * Source Priority (for conflict resolution):
 * 1. Jikan (MyAnimeList) - Primary, most complete metadata
 * 2. TMDB - Episode titles, air dates, images
 * 3. Skyhook (TVDB) - Episode numbering, guest stars
 * 4. Trakt - User ratings, watch counts
 * 5. Notify - Alternative titles
 * 6. Theme - Opening/ending themes
 */
@Injectable()
export class EpisodesResolver {
  constructor(
    private readonly jikan: JikanService,
    private readonly skyhook: SkyhookService,
    private readonly tmdb: TmdbService,
    private readonly trakt: TraktService,
    private readonly notify: NotifyService,
    private readonly theme: ThemeService,
    private readonly thexem: TheXemService,
    private readonly logger: LoggerService,
    private readonly experiment: ExperimentService,
    private readonly arm: ArmService,
  ) {}

  /**
   * Resolve and merge episodes from all available sources.
   * Currently Jikan-only baseline; Phase 5 will enable additional sources behind feature flags.
   *
   * @param malId MyAnimeList series ID
   * @param seriesKey Series identifier for logging
   * @param includeOrphans Include unmatched secondary episodes (default: false)
   * @returns Merge result with episodes and statistics
   */
  async resolve(
    malId: number,
    seriesKey: string,
    includeOrphans = false,
  ): Promise<MergeResult & { titleSimThreshold: number | null }> {
    this.logger.instance.info('Resolving episodes for series', {
      seriesKey,
      malId,
      source: 'jikan',
    });

    try {
      const jikanSlice = await this.fetchJikanSlice(malId, seriesKey);
      // Primary source (JIKAN) is mandatory: bail out early if unavailable
      if (!jikanSlice) {
        this.logger.instance.error(
          'Primary Jikan source unavailable, aborting merge',
          {
            seriesKey,
            malId,
          },
        );
        throw new Error(
          `Primary source (JIKAN) unavailable for seriesKey=${seriesKey}, malId=${malId}`,
        );
      }
      const slices: EpisodeSourceSlice[] = [];
      slices.push(jikanSlice);

      // Prepare cross-source ID relations once (avoid repeated ARM calls)
      const needRelations = Boolean(
        this.experiment?.isEnabled('enable-skyhook-source') ||
          this.experiment?.isEnabled('enable-tmdb-source') ||
          this.experiment?.isEnabled('enable-trakt-source') ||
          this.experiment?.isEnabled('enable-notify-source'),
      );
      let relations: SeriesRelationId | undefined;
      if (needRelations) {
        try {
          relations = await this.arm.getRelationsById('myanimelist', malId);
        } catch (e) {
          this.logger.instance.warn('ARM mapping lookup failed', {
            seriesKey,
            error: (e as Error).message,
          });
        }
      }

      // Conditionally attempt other sources behind feature flags
      if (this.experiment?.isEnabled('enable-skyhook-source')) {
        const skyhookSlice = await this.fetchSkyhookSlice(seriesKey, relations);
        if (skyhookSlice) {
          slices.push(skyhookSlice);
        } else {
          this.logger.instance.debug(
            'Skyhook feature enabled, slice unavailable',
          );
        }
      }
      if (this.experiment?.isEnabled('enable-tmdb-source')) {
        const tmdbSlice = await this.fetchTmdbSlice(seriesKey, relations);
        if (tmdbSlice) slices.push(tmdbSlice);
        else {
          this.logger.instance.debug(
            'TMDB feature enabled, slice unavailable',
          );
        }
      }
      if (this.experiment?.isEnabled('enable-trakt-source')) {
        const traktSlice = await this.fetchTraktSlice(seriesKey, relations);
        if (traktSlice) slices.push(traktSlice);
        else {
          this.logger.instance.debug(
            'Trakt feature enabled, slice unavailable',
          );
        }
      }
      if (this.experiment?.isEnabled('enable-notify-source')) {
        const notifySlice = await this.fetchNotifySlice(seriesKey, relations);
        if (notifySlice) slices.push(notifySlice);
        else {
          this.logger.instance.debug(
            'Notify feature enabled, slice unavailable',
          );
        }
      }

      const rawThreshold = this.experiment?.getFeatureValue(
        'episode-align-title-sim',
        0,
      ) ?? 0.8;
      const titleSimThreshold = rawThreshold > 0 && rawThreshold <= 1
        ? rawThreshold
        : null;

      const result = mergeEpisodes(
        {
          preferRuntime: 'JIKAN',
          titleSimThreshold,
          includeOrphans,
        },
        slices.filter((s): s is EpisodeSourceSlice => s !== null),
      );

      this.logger.instance.info('Merge complete', {
        seriesKey,
        titleSimThreshold,
        ...result.stats,
      });

      // Optional enrichment: Themes (openings/endings)
      if (this.experiment?.isEnabled('enable-themes-source')) {
        try {
          const themes = await this.theme.getThemesForAnime(malId);
          if (themes && themes.length > 0) {
            const openings = themes
              .filter((t) => t.meta.type === 'OP')
              .map((t) => t.name);
            const endings = themes
              .filter((t) => t.meta.type === 'ED')
              .map((t) => t.name);

            if (openings.length > 0 || endings.length > 0) {
              for (const ep of result.episodes) {
                const currentOpenings = ep.themes?.openings ?? [];
                const currentEndings = ep.themes?.endings ?? [];
                ep.themes = {
                  openings: currentOpenings.length > 0
                    ? currentOpenings
                    : openings.slice(),
                  endings: currentEndings.length > 0
                    ? currentEndings
                    : endings.slice(),
                } as typeof ep.themes;
                if (!ep.sources.includes('THEMES')) {
                  ep.sources.push('THEMES');
                }
              }
            }
          }
        } catch (e) {
          this.logger.instance.warn('Themes enrichment failed', {
            error: (e as Error).message,
          });
        }
      }

      return { ...result, titleSimThreshold };
    } catch (error) {
      this.logger.instance.error('Failed to resolve episodes', {
        seriesKey,
        malId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Fetch episode slice from Jikan (MyAnimeList)
   */
  private async fetchJikanSlice(
    malId: number,
    seriesKey: string,
  ): Promise<EpisodeSourceSlice | null> {
    const anime = await this.jikan.getAnime(malId, {
      episodes: true,
      maxEpisodes: 500,
    });

    if (!anime?.episodes_list) {
      this.logger.instance.warn('No episodes found in Jikan response', {
        seriesKey,
        malId,
      });
      return null;
    }

    const canonical = anime.episodes_list.map(toCanonicalEpisode);

    this.logger.instance.debug('Fetched Jikan slice', {
      seriesKey,
      count: canonical.length,
    });

    return { source: 'JIKAN', episodes: canonical, remapped: 0 };
  }

  // TODO Phase 5: Implement secondary source fetchers
  /**
   * Placeholder: Feature-gated fetchers for Phase 5. Return null while disabled/unimplemented
   * to keep current behavior identical to Jikan-only baseline.
   */

  private async fetchSkyhookSlice(
    _seriesKey: string,
    relations?: SeriesRelationId,
  ): Promise<EpisodeSourceSlice | null> {
    try {
      const tvdbId = relations?.thetvdb ?? null;
      if (!tvdbId) {
        this.logger.instance.debug(
          'Skyhook fetch skipped: missing TVDB mapping',
          { seriesKey: _seriesKey },
        );
        return null;
      }

      const show = await this.skyhook.getShowByTvdb(tvdbId);
      if (
        !show || !Array.isArray(show.episodes) || show.episodes.length === 0
      ) {
        this.logger.instance.debug('Skyhook show has no episodes', {
          seriesKey: _seriesKey,
          tvdbId,
        });
        return null;
      }

      // TheXem remapping to absolute numbering for alignment with MAL
      const mappings = await this.thexem.getMappingsByTvdb(tvdbId);
      const absMap = this.thexem.buildTvdbSeasonEpisodeToAbsoluteMap(mappings);

      let remapped = 0;
      const episodes: EpisodeCanonical[] = show.episodes.map((ep) => {
        const key = `${ep.seasonNumber}-${ep.episodeNumber}`;
        const mappedAbs = absMap.get(key);
        if (mappedAbs && mappedAbs > 0) remapped += 1;

        const absoluteNumber = ep.absoluteEpisodeNumber ?? mappedAbs ?? null;

        // Prefer absolute for alignment number when available
        const number =
          (absoluteNumber ?? ep.episodeNumber ?? ep.tvdbId) as number;

        const canonical: EpisodeCanonical = {
          id: ep.tvdbId,
          number,
          title: ep.title
            ? { english: ep.title, romanji: null, native: null }
            : null,
          synopsis: ep.overview ?? null,
          aired: ep.airDateUtc
            ? toInstant(ep.airDateUtc)
            : (ep.airDate ? toInstant(ep.airDate) : null),
          score: null,
          kind: ep.seasonNumber === 0 ? 'special' : 'main',
          duration: ep.runtime ?? null,
          url: null,
          tvdbShowId: ep.tvdbShowId ?? show.tvdbId ?? null,
          tvdbId: ep.tvdbId ?? null,
          tmdbId: show.tmdbId ?? null,
          seasonNumber: ep.seasonNumber ?? null,
          episodeNumber: ep.episodeNumber ?? null,
          absoluteEpisodeNumber: absoluteNumber,
          airedBeforeSeasonNumber: ep.airedBeforeSeasonNumber ?? null,
          airedBeforeEpisodeNumber: ep.airedBeforeEpisodeNumber ?? null,
          airedAfterSeasonNumber: ep.airedAfterSeasonNumber ?? null,
          airedAfterEpisodeNumber: ep.airedAfterEpisodeNumber ?? null,
          image: ep.image ?? null,
          poster: (show as { poster?: string }).poster ?? null,
          themes: { openings: [], endings: [] },
        };
        return canonical;
      });

      this.logger.instance.debug('Fetched Skyhook slice', {
        seriesKey: _seriesKey,
        tvdbId,
        count: episodes.length,
        remapped,
      });

      return { source: 'SKYHOOK', episodes, remapped };
    } catch (e) {
      this.logger.instance.warn('Skyhook fetch failed', {
        seriesKey: _seriesKey,
        error: (e as Error).message,
      });
      return null;
    }
  }

  private async fetchTmdbSlice(
    _seriesKey: string,
    relations?: SeriesRelationId,
  ): Promise<EpisodeSourceSlice | null> {
    try {
      const tmdbId = relations?.themoviedb ?? null;
      if (!tmdbId) {
        this.logger.instance.debug('TMDB fetch skipped: missing TMDB mapping', {
          seriesKey: _seriesKey,
        });
        return null;
      }

      // Fetch show meta for poster and seasons
      const show = await this.tmdb.getShow(tmdbId);
      if (!show) return null;

      const seasons = (show.seasons ?? []).map((s) => s.season_number).filter(
        (n): n is number => typeof n === 'number',
      );

      // Load each season's episodes
      const episodes: EpisodeCanonical[] = [];
      for (const seasonNumber of seasons) {
        const season = await this.tmdb.getSeason(seasonNumber, tmdbId);
        const seasonPoster = season?.poster_path ?? show.poster_path ?? null;
        const mapped: EpisodeCanonical[] = (season?.episodes ?? []).map(
          (ep) => {
            const air = ep.air_date ? toInstant(ep.air_date) : null;
            return {
              id: ep.id,
              number: ep.episode_number ?? ep.id,
              title: ep.name
                ? { english: ep.name, romanji: null, native: null }
                : null,
              synopsis: ep.overview ?? null,
              aired: air,
              score: ep.vote_average ?? null,
              kind: ep.season_number === 0 ? 'special' : 'main',
              duration: ep.runtime ?? null,
              url: null,
              tvdbShowId: null,
              tvdbId: null,
              tmdbId: ep.id,
              seasonNumber: seasonNumber ?? null,
              episodeNumber: ep.episode_number ?? null,
              absoluteEpisodeNumber: null,
              airedBeforeSeasonNumber: null,
              airedBeforeEpisodeNumber: null,
              airedAfterSeasonNumber: null,
              airedAfterEpisodeNumber: null,
              image: ep.still_path ?? null,
              poster: seasonPoster,
              themes: { openings: [], endings: [] },
            };
          },
        );
        episodes.push(...mapped);
      }

      if (episodes.length === 0) return null;

      this.logger.instance.debug('Fetched TMDB slice', {
        seriesKey: _seriesKey,
        tmdbId,
        count: episodes.length,
      });

      return { source: 'TMDB', episodes, remapped: 0 };
    } catch (e) {
      this.logger.instance.warn('TMDB fetch failed', {
        seriesKey: _seriesKey,
        error: (e as Error).message,
      });
      return null;
    }
  }

  private async fetchTraktSlice(
    _seriesKey: string,
    relations?: SeriesRelationId,
  ): Promise<EpisodeSourceSlice | null> {
    try {
      const imdbId = relations?.imdb ?? null;

      if (!imdbId) {
        this.logger.instance.debug('Trakt fetch skipped: no usable key');
        return null;
      }

      const seasons = await this.trakt.getSeasons(imdbId, {
        extended: 'episodes',
      });
      if (!seasons || seasons.length === 0) return null;

      const episodes: EpisodeCanonical[] = [];
      for (const season of seasons) {
        const seasonNumber = season.number ?? null;
        for (const ep of season.episodes ?? []) {
          episodes.push({
            id: ep.ids.trakt,
            number: ep.number_abs || ep.number || ep.ids.trakt,
            title: ep.title
              ? { english: ep.title, romanji: null, native: null }
              : null,
            synopsis: ep.overview ?? null,
            aired: ep.first_aired ?? null,
            score: ep.rating ?? null,
            kind: seasonNumber === 0 ? 'special' : 'main',
            duration: ep.runtime ?? null,
            url: null,
            tvdbShowId: relations?.thetvdb ?? null,
            tvdbId: ep.ids.tvdb ?? null,
            tmdbId: ep.ids.tmdb ?? null,
            seasonNumber,
            episodeNumber: ep.number ?? null,
            absoluteEpisodeNumber: ep.number_abs || null,
            airedBeforeSeasonNumber: null,
            airedBeforeEpisodeNumber: null,
            airedAfterSeasonNumber: null,
            airedAfterEpisodeNumber: null,
            image: null,
            poster: null,
            themes: { openings: [], endings: [] },
          });
        }
      }

      if (episodes.length === 0) return null;

      this.logger.instance.debug('Fetched Trakt slice', {
        seriesKey: _seriesKey,
        count: episodes.length,
      });
      return { source: 'TRAKT', episodes, remapped: 0 };
    } catch (e) {
      this.logger.instance.warn('Trakt fetch failed', {
        seriesKey: _seriesKey,
        error: (e as Error).message,
      });
      return null;
    }
  }

  private async fetchNotifySlice(
    _seriesKey: string,
    relations?: SeriesRelationId,
  ): Promise<EpisodeSourceSlice | null> {
    try {
      const notifyId = relations?.notify ?? null;
      if (!notifyId) {
        this.logger.instance.debug('Notify fetch skipped: missing notify id', {
          seriesKey: _seriesKey,
        });
        return null;
      }

      const anime = await this.notify.getAnime(String(notifyId), {
        withEpisodes: true,
      });
      if (
        !anime || !Array.isArray(anime.episodes) || anime.episodes.length === 0
      ) {
        this.logger.instance.debug('Notify anime has no episodes', {
          seriesKey: _seriesKey,
          notifyId,
        });
        return null;
      }

      const episodes: EpisodeCanonical[] = anime.episodes.map((ep) => ({
        id: Number(ep.id) || ep.number,
        number: ep.number,
        title: ep.title
          ? { english: ep.title, romanji: null, native: null }
          : null,
        synopsis: null,
        aired: ep.startAirDate ?? null,
        score: null,
        kind: null,
        duration: null,
        url: null,
        tvdbShowId: null,
        tvdbId: null,
        tmdbId: null,
        seasonNumber: null,
        episodeNumber: null,
        absoluteEpisodeNumber: ep.number,
        airedBeforeSeasonNumber: null,
        airedBeforeEpisodeNumber: null,
        airedAfterSeasonNumber: null,
        airedAfterEpisodeNumber: null,
        image: null,
        poster: anime.poster?.large ?? null,
        themes: { openings: [], endings: [] },
      }));

      this.logger.instance.debug('Fetched Notify slice', {
        seriesKey: _seriesKey,
        notifyId,
        count: episodes.length,
      });

      return { source: 'NOTIFY', episodes, remapped: 0 };
    } catch (e) {
      this.logger.instance.warn('Notify fetch failed', {
        seriesKey: _seriesKey,
        error: (e as Error).message,
      });
      return null;
    }
  }
}
