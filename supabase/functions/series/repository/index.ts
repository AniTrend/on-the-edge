import { currentDate } from '../../_shared/core/utils.ts';
import { Growth } from '../../_shared/types/core.d.ts';
import { IResponse } from '../../_shared/types/response.d.ts';
import Arm from '../service/arm/remote.ts';
import Jikan from '../service/jikan/remote.ts';
import Notify from '../service/notify/remote.ts';
import Skyhook from '../service/skyhook/remote.ts';
import Theme from '../service/theme/remote.ts';
import Tmdb from '../service/tmdb/remote.ts';
import Trakt from '../service/trakt/remote.ts';
import { type SeriesRelation } from '../types.d.ts';
import LocalSource from './local.ts';

export default class Repository {
  constructor(
    private readonly arm: Arm,
    private readonly jikan: Jikan,
    private readonly notify: Notify,
    private readonly skyhook: Skyhook,
    private readonly theme: Theme,
    private readonly tmdb: Tmdb,
    private readonly trakt: Trakt,
    private readonly local: LocalSource,
    private readonly growth: Growth,
  ) {}

  getById = async (anilist: number): Promise<IResponse<SeriesRelation>> => {
    const relation = await this.arm.getRelation(anilist);
    let skyhook, tmdb, themes, notify, mal, trakt;
    if (relation?.notify) {
      notify = await this.notify.anime(
        relation?.notify,
      );
    }

    if (relation?.myanimelist) {
      mal = await this.jikan.anime(
        relation?.myanimelist,
      );
    }
    if (relation?.myanimelist) {
      themes = await this.theme.songs(
        relation?.myanimelist,
      );
    }

    if (relation?.animePlanet) {
      trakt = await this.trakt.show(
        relation?.animePlanet,
      );
    }
    if (relation?.thetvdb) {
      skyhook = await this.skyhook.show(
        relation?.thetvdb,
      );
    }

    if (relation?.themoviedb) {
      tmdb = await this.tmdb.details(
        relation?.themoviedb,
      );
    } else if (trakt?.ids.tmdb) {
      tmdb = await this.tmdb.details(
        trakt?.ids.tmdb,
      );
    }

    // what season is this? :think:
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
          themoviedb: relation?.themoviedb,
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
}
