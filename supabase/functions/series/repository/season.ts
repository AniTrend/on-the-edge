import { zip } from 'std/collections';
import { deepmerge } from 'x/deepmerge';
import { getTmdbSeason } from '../service/tmdb/index.ts';
import { isMovie } from '../utils/index.ts';
import { NotifyAnime } from '../service/notify/types.d.ts';
import { SkyhookEpisode, SkyhookShow } from '../service/skyhook/types.d.ts';
import { TmdbEpisode, TmdbSeason, TmdbShow } from '../service/tmdb/types.d.ts';
import { MergedEpisode, MergedSeason } from '../transformer/types.d.ts';
import { AnimeRelationId } from '../service/arm/types.d.ts';

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
  ): MergedEpisode[] =>
    zip(tmdbEpisodes, skyhookEpisodes).map((data) =>
      deepmerge(data[0], data[1]) as MergedEpisode
    );

  private mergeSeasons = (
    tmdbSeasons: TmdbSeason[],
    filteredTmdbSeasons: TmdbSeason[],
    skyhookEpisodes: SkyhookEpisode[],
  ): MergedSeason[] => {
    return zip(tmdbSeasons, filteredTmdbSeasons)
      .map((data) => deepmerge(data[0], data[1]))
      .map((mergedSeason) => ({
        ...mergedSeason,
        episodes: Array.isArray(mergedSeason?.episodes)
          ? this.mergeEpisodes(mergedSeason!.episodes, skyhookEpisodes)
          : [],
      })) as MergedSeason[];
  };

  private mergeSeasonWithAnimeIds = (
    _mergedSeasons: MergedSeason[],
    _relations: AnimeRelationId[],
  ): MergedSeason[] => {
    // find relationships between mergedSeason[x].tmdbId and relations[x].themoviedb
    throw new Error('Not implemented');
  };

  getSeasons = async (
    notify?: NotifyAnime,
    skyhook?: SkyhookShow,
    tmdb?: TmdbShow,
    _relations?: AnimeRelationId[],
  ): Promise<MergedSeason[]> => {
    if (isMovie(notify?.format)) {
      return [];
    }

    const filteredTmdbSeasons = await this.getFilteredTmdbSeasons(tmdb);
    const seasons = this.mergeSeasons(
      tmdb?.seasons ?? [],
      filteredTmdbSeasons,
      skyhook?.episodes ?? [],
    );

    return seasons;
  };
}
