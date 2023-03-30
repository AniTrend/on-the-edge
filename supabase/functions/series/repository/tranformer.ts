import { currentDate } from '../../_shared/core/utils.ts';
import { IResponse } from '../../_shared/types/response.d.ts';
import { AnimeRelationId } from '../service/arm/types.d.ts';
import { JikanAnime } from '../service/jikan/types.d.ts';
import { NotifyAnime } from '../service/notify/types.d.ts';
import { SkyhookShow } from '../service/skyhook/types.d.ts';
import { AnimeTheme } from '../service/theme/types.d.ts';
import { TmdbShow } from '../service/tmdb/types.d.ts';
import { TraktShow } from '../service/trakt/types.d.ts';
import { Media } from '../types.d.ts';

export const transform = async (
  relation?: AnimeRelationId,
  skyhook?: SkyhookShow,
  tmdb?: TmdbShow,
  themes?: AnimeTheme[],
  notify?: NotifyAnime,
  mal?: JikanAnime,
  trakt?: TraktShow,
): Promise<IResponse<Media>> => {
  return await Promise.resolve({
    data: {
      mediaId: {
        anidb: relation?.anidb,
        anilist: relation?.anilist,
        animePlanet: relation?.animePlanet,
        anisearch: relation?.anisearch,
        imdb: relation?.imdb ?? skyhook?.imdbId ?? trakt?.mediaId.imdb,
        kitsu: relation?.kitsu,
        livechart: relation?.livechart,
        notify: relation?.notify,
        themoviedb: relation?.themoviedb ?? tmdb?.id,
        thetvdb: relation?.thetvdb ?? skyhook?.tvdbId ?? trakt?.mediaId.tvdb,
        myanimelist: relation?.myanimelist ?? mal?.mal_id,
        tvMazeId: skyhook?.tvMazeId,
        tvrage: trakt?.mediaId.tvrage,
        slug: skyhook?.slug ?? trakt?.mediaId.slug,
        shoboi: notify?.mediaId?.shoboi,
        trakt: trakt?.mediaId.trakt,
      },
      banner: skyhook?.banner,
      poster: skyhook?.poster,
      fanart: skyhook?.fanart,
      title: {
        english: mal?.title_english ?? notify?.title.english,
        canonical: mal?.title ?? notify?.title.canonical,
        harigana: notify?.title.harigana,
        japanese: mal?.title_japanese ?? notify?.title.native ??
          tmdb?.original_name,
        romaji: notify?.title.romaji,
        synonyms: mal?.title_synonyms ?? notify?.title.synonyms,
      },
      themes: themes,
      schedule: {
        firstAirDate: tmdb?.first_air_date,
        lastAirDate: tmdb?.last_air_date,
        lastAiredEpisode: tmdb?.last_episode_to_air,
      },
      rating: {
        age: mal?.rating,
        adult: tmdb?.adult,
        content: skyhook?.contentRating ?? trakt?.certification,
      },
      trailer: trakt?.trailer,
      network: {
        primary: skyhook?.network ?? trakt?.network,
        others: tmdb?.networks,
      },
      producation: {
        countries: tmdb?.production_countries,
        networks: tmdb?.production_companies,
      },
      seasons: skyhook?.seasons,
      episodes: skyhook?.episodes,
      images: tmdb?.images,
      homepage: tmdb?.homepage,
      updated_at: currentDate(),
      description: notify?.summary ?? mal?.synopsis ?? tmdb?.overview ??
        skyhook?.overview,
    },
  });
};
