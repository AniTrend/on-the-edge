import { IResponse } from '../../_shared/types/response.d.ts';
import { getAniListRelationId } from '../service/arm/index.ts';
import { getJikanAnime } from '../service/jikan/index.ts';
import { getNotifyAnime } from '../service/notify/index.ts';
import { getSkyhookShow } from '../service/skyhook/index.ts';
import { getThemesForAnime } from '../service/theme/index.ts';
import { getTmdbShow } from '../service/tmdb/index.ts';
import { getTraktShow } from '../service/trakt/index.ts';
import { transform } from './tranformer.ts';
import { Media } from '../types.d.ts';
import LocalSource from '../local/index.ts';

export default class Repository {
  constructor(
    private readonly local: LocalSource,
  ) {}

  getById = async (anilist: number): Promise<IResponse<Media>> => {
    const relation = await getAniListRelationId(anilist);

    const notify = await getNotifyAnime(relation?.notify);

    const mal = await getJikanAnime(relation?.myanimelist);

    const themes = await getThemesForAnime(relation?.myanimelist);

    const skyhook = await getSkyhookShow(relation?.thetvdb);

    const trakt = await getTraktShow(skyhook?.slug);

    const tmdb = await getTmdbShow(
      relation?.themoviedb ?? trakt?.mediaId.tmdb,
    );

    return await transform(relation, skyhook, tmdb, themes, notify, mal, trakt);
  };
}
