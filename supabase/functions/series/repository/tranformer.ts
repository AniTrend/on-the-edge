import { currentDate } from '../../_shared/core/utils.ts';
import { IResponse } from '../../_shared/types/response.d.ts';
import { Relation } from '../service/arm/types.d.ts';
import { IAnimeResource } from '../service/jikan/types.d.ts';
import { Anime } from '../service/notify/types.d.ts';
import { Show as SkyhookShow } from '../service/skyhook/types.d.ts';
import { Theme } from '../service/theme/types.d.ts';
import { Show as TmdbShow } from '../service/tmdb/types.d.ts';
import { Show as TraktShow } from '../service/trakt/types.d.ts';
import { SeriesRelation } from '../types.d.ts';

export const transform = async (
  relation: Relation,
  skyhook: SkyhookShow | undefined,
  tmdb: TmdbShow | undefined,
  themes: Theme[] | undefined,
  notify: Anime | undefined,
  mal: IAnimeResource | undefined,
  trakt: TraktShow | undefined,
): Promise<IResponse<SeriesRelation>> => {
  return await Promise.resolve({
    data: {
      ids: {
        anidb: relation?.anidb,
        anilist: relation?.anilist,
        animePlanet: relation?.animePlanet,
        anisearch: relation?.anisearch,
        imdb: relation?.imdb ?? skyhook?.imdbId ?? trakt?.ids.imdb,
        kitsu: relation?.kitsu,
        livechart: relation?.livechart,
        notify: relation?.notify,
        themoviedb: relation?.themoviedb ?? tmdb?.id,
        thetvdb: relation?.thetvdb ?? skyhook?.tvdbId ?? trakt?.ids.tvdb,
        myanimelist: relation?.myanimelist ?? mal?.mal_id,
        tvMazeId: skyhook?.tvMazeId,
        tvrage: trakt?.ids.tvrage,
        slug: skyhook?.slug ?? trakt?.ids.slug,
        shoboi: notify?.ids?.shoboi,
        trakt: trakt?.ids.trakt,
      },
      titles: {
        english: mal?.title_english ?? notify?.title.english,
        canonical: mal?.title ?? notify?.title.canonical,
        hiragana: notify?.title.hiragana,
        japanese: mal?.title_japanese ?? notify?.title.japanese ??
          tmdb?.original_name,
        romaji: notify?.title.romaji,
        synonyms: mal?.title_synonyms ?? notify?.title.synonyms,
      },
      themes: themes,
      airs: trakt?.airs,
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
      networks: {
        primary: skyhook?.network ?? trakt?.network,
        all: tmdb?.networks,
      },
      producation: {
        countries: tmdb?.production_countries,
        companies: tmdb?.production_companies,
      },
      images: skyhook?.images,
      extraImages: tmdb?.images,
      homepage: tmdb?.homepage,
      updated_at: currentDate(),
      description: notify?.summary ?? mal?.synopsis ?? tmdb?.overview ??
        skyhook?.overview,
    },
  });
};
