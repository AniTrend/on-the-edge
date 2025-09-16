import { zip } from '@std/collections';
import { getTmdbSeason } from '../../service/tmdb/index.ts';
import { isMovie } from '../../series/utils/index.ts';
import { NotifyAnime } from '../../service/notify/types.ts';
import { SkyhookEpisode, SkyhookShow } from '../../service/skyhook/types.ts';
import { TmdbEpisode, TmdbSeason, TmdbShow } from '../../service/tmdb/types.ts';
import { MergedEpisode, MergedSeason } from '../../series/transformer/types.ts';
import { logger } from '../../common/core/index.ts';
import { Season } from '../../service/tmdb/remote/index.ts';
// import { SeasonCorrelationMapper } from './season-correlation/index.ts';

/**
 * DEPRECATED: SeasonRepository
 * This repository is slated for removal. Season-based integration is now orchestrated
 * by EpisodesRepository using helpers under src/series/episodes/helpers/.
 * Keep only as a temporary shim for any legacy references.
 */
export default class SeasonRepository {
  constructor(
    private readonly filters: {
      season: number;
      episode: number;
    }[],
  ) {}

  private getFilteredTmdbSeasons = async (
    id: number,
    seasonNumbers: number[],
  ): Promise<Season[]> => {
    const tmdbSeasonsPromise = seasonNumbers?.map((seasonNumber) =>
      getTmdbSeason(seasonNumber, id)
    );
    const seasons = await Promise.all(tmdbSeasonsPromise);
    return seasons.filter((season) => season !== undefined);
  };

  private mergeEpisodes = (
    tmdbEpisodes: TmdbEpisode[],
    skyhookEpisodes: SkyhookEpisode[],
  ): MergedEpisode[] => {
    const zipped = zip(tmdbEpisodes, skyhookEpisodes).map((
      [tmdbEpisode, skyhookEpisode],
    ) => ({
      id: tmdbEpisode.id,
      tvdbShowId: skyhookEpisode.tvdbShowId,
      tvdbId: skyhookEpisode.tvdbId,
      tmdbShowId: tmdbEpisode.show_id,
      seasonNumber: skyhookEpisode.seasonNumber ?? tmdbEpisode.season_number,
      episodeNumber: skyhookEpisode.episodeNumber ?? tmdbEpisode.episode_number,
      absoluteEpisodeNumber: skyhookEpisode.absoluteEpisodeNumber,
      airedBeforeSeasonNumber: skyhookEpisode.airedBeforeSeasonNumber,
      airedBeforeEpisodeNumber: skyhookEpisode.airedBeforeEpisodeNumber,
      airedAfterSeasonNumber: skyhookEpisode.airedAfterSeasonNumber,
      airedAfterEpisodeNumber: skyhookEpisode.airedAfterEpisodeNumber,
      title: skyhookEpisode.title,
      airDate: skyhookEpisode.airDate ?? tmdbEpisode.air_date,
      airDateUtc: skyhookEpisode.airDateUtc,
      runtime: skyhookEpisode.runtime ?? tmdbEpisode.runtime ?? 0,
      finaleType: skyhookEpisode.finaleType,
      overview: skyhookEpisode.overview ?? tmdbEpisode.overview,
      image: skyhookEpisode.image,
      name: skyhookEpisode.title ?? tmdbEpisode.name,
      productionCode: tmdbEpisode.production_code,
      stillPath: tmdbEpisode.still_path,
      voteAverage: tmdbEpisode.vote_average,
      voteCount: tmdbEpisode.vote_count,
      staff: [...tmdbEpisode.crew, ...tmdbEpisode.guest_stars],
    }));
    return zipped;
  };

  private mergeSeasons = (
    tmdbSeasons: TmdbSeason[],
    skyhookEpisodes: SkyhookEpisode[],
  ): MergedSeason[] => {
    return tmdbSeasons.map((tmdbSeason) => {
      const tmdbEpisodes = tmdbSeason?.episodes ?? [];

      // No TMDB episodes for this season — return season shell with empty episodes
      if (tmdbEpisodes.length === 0) {
        return { ...tmdbSeason, episodes: [] } as MergedSeason;
      }

      // Build a quick lookup of episode numbers present in the TMDB season
      const tmdbEpisodeNumbers = new Set(
        tmdbEpisodes.map((e) => e.episode_number),
      );

      // Keep only Skyhook episodes that belong to the same season and exist in TMDB
      const matchingSkyhook = skyhookEpisodes.filter((ep) =>
        ep.seasonNumber === tmdbSeason.season_number &&
        ep.episodeNumber !== undefined &&
        tmdbEpisodeNumbers.has(Number(ep.episodeNumber))
      );

      return {
        ...tmdbSeason,
        episodes: this.mergeEpisodes(tmdbEpisodes, matchingSkyhook),
      } as MergedSeason;
    });
  };

  getSeasons = async (
    notify?: NotifyAnime,
    skyhook?: SkyhookShow,
    tmdb?: TmdbShow,
  ): Promise<MergedSeason[]> => {
    // Movies do not have seasons
    if (isMovie(notify?.format)) return [];

    // Without TMDB, we can't fetch season/episode scaffolding
    if (!tmdb) {
      logger.warn(
        'series.episodes.repository.season:getSeasons: No TMDB data available',
        { filters: this.filters },
      );
      return [];
    }

    // Build requested season number set from filters (deduped)
    const requested = new Set(this.filters.map((f) => f.season));
    const availableSeasonNumbers = tmdb.seasons.map((s) => s.season_number);
    const seasonNumbers = availableSeasonNumbers.filter((n) =>
      requested.size === 0 || requested.has(n)
    );

    logger.debug(
      'series.episodes.repository.season:getSeasons: Filtering TMDB seasons',
      { requested: [...requested], selected: seasonNumbers },
    );

    const filteredTmdbSeasons = await this.getFilteredTmdbSeasons(
      tmdb.id,
      seasonNumbers,
    );

    return this.mergeSeasons(
      filteredTmdbSeasons,
      skyhook?.episodes ?? [],
    );
  };
}
