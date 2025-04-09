import { zip } from '@std/collections';
import { deepmerge } from '@deepmerge';
import { getTmdbSeason } from '../service/tmdb/index.ts';
import { isMovie } from '../utils/index.ts';
import { NotifyAnime } from '../service/notify/types.ts';
import { SkyhookEpisode, SkyhookShow } from '../service/skyhook/types.ts';
import { TmdbEpisode, TmdbSeason, TmdbShow } from '../service/tmdb/types.ts';
import { MergedEpisode, MergedSeason } from '../transformer/types.ts';
import { AnimeRelationId } from '../service/arm/types.ts';
import {
  EnhancedMergedSeason,
  SeasonCorrelationMapper,
} from './season-correlation/index.ts';

export default class SeasonRepository {
  constructor() {}

  private getFilteredTmdbSeasons = async (tmdb?: TmdbShow) => {
    const tmdbSeasons = tmdb?.seasons?.flatMap(async (data) => {
      const season = await getTmdbSeason(data.season_number, tmdb.id);
      return season ? [season] : [];
    });
    return await Promise.all(tmdbSeasons ?? []).then((seasons) =>
      seasons.flat()
    );
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
      name: tmdbEpisode.name,
      productionCode: tmdbEpisode.production_code,
      stillPath: tmdbEpisode.still_path,
      voteAverage: tmdbEpisode.vote_average,
      voteCount: tmdbEpisode.vote_count,
      crew: tmdbEpisode.crew,
      guestStars: tmdbEpisode.guest_stars,
    }));
    return zipped;
  };

  private mergeSeasons = (
    tmdbSeasons: TmdbSeason[],
    filteredTmdbSeasons: TmdbSeason[],
    skyhookEpisodes: SkyhookEpisode[],
  ): MergedSeason[] => {
    return zip(tmdbSeasons, filteredTmdbSeasons)
      .map((data) => deepmerge(data[0], data[1]))
      .map((mergedSeason) => ({
        ...mergedSeason,
        episodes: mergedSeason?.episodes
          ? this.mergeEpisodes(
            mergedSeason.episodes,
            skyhookEpisodes.filter((episode) =>
              episode.seasonNumber == mergedSeason.season_number
            ),
          )
          : [],
      })) as MergedSeason[];
  };

  getSeasons = async (
    notify?: NotifyAnime,
    skyhook?: SkyhookShow,
    tmdb?: TmdbShow,
    relations?: AnimeRelationId[],
  ): Promise<MergedSeason[]> => {
    if (isMovie(notify?.format)) {
      return [];
    }

    // Try to use the season correlation mapper if we have anime data
    if (notify || relations?.length) {
      const correlationMapper = new SeasonCorrelationMapper(
        notify,
        skyhook,
        tmdb,
        relations || [],
      );

      // Get correlated seasons with anime mapping
      const correlatedSeasons = correlationMapper.correlateSeasons();

      // If we successfully correlated seasons, return them
      if (correlatedSeasons.length > 0) {
        return correlatedSeasons as MergedSeason[];
      }
    }

    // Fall back to the original season merging logic if correlation fails
    // or if we don't have sufficient anime data
    const filteredTmdbSeasons = await this.getFilteredTmdbSeasons(tmdb);
    const seasons = this.mergeSeasons(
      tmdb?.seasons ?? [],
      filteredTmdbSeasons,
      skyhook?.episodes ?? [],
    );

    return seasons;
  };
}
