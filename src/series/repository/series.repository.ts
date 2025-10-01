import { IResponse } from '@scope/common/types';
import { getAniListRelationId } from '@scope/service/arm';
import { getJikanAnime } from '@scope/service/jikan';
import { getNotifyAnime } from '@scope/service/notify';
import { getSkyhookShow } from '@scope/service/skyhook';
import { getThemesForAnime } from '@scope/service/theme';
import { getTmdbShow } from '@scope/service/tmdb';
import { getTraktShow } from '@scope/service/trakt';
import { seriesTransform } from '../transformer/series.transformer.ts';
import { MediaEntity } from '../types.ts';
import { isAnime } from './helpers/qualifier.ts';
import LocalSource from '../local/series.local.source.ts';
import { Theme } from '@scope/service/theme';
import { SkyhookShow } from '@scope/service/skyhook';
import { Show } from '@scope/service/trakt';
import { TmdbShow } from '@scope/service/tmdb';
import { currentDate, isOlderThan } from '@scope/common/core';
import { MediaParamId } from '../local/index.ts';

export default class SeriesRepository {
  constructor(
    private readonly local: LocalSource,
  ) {}

  private fetchFromRemote = async (
    id: MediaParamId,
  ): Promise<IResponse<MediaEntity>> => {
    const relation = await getAniListRelationId(id.anilist);

    const [notify, mal] = await Promise.all([
      getNotifyAnime(relation?.notify),
      getJikanAnime(relation?.myanimelist),
    ]);

    let themes: Theme[] | undefined,
      skyhook: SkyhookShow | undefined,
      trakt: Show | undefined,
      tmdb: TmdbShow | undefined;
    if (isAnime(mal?.type)) {
      [themes, skyhook] = await Promise.all([
        getThemesForAnime(relation?.myanimelist),
        getSkyhookShow(relation?.thetvdb),
      ]);
      [trakt] = await Promise.all([
        getTraktShow(relation?.animePlanet ?? skyhook?.slug),
      ]);

      tmdb = await getTmdbShow(relation?.themoviedb ?? trakt?.mediaId.tmdb);
    }

    const media = seriesTransform(
      relation,
      skyhook,
      tmdb,
      themes,
      notify,
      mal,
      trakt,
    );

    return await this.local.save(media);
  };

  getById = async (id: MediaParamId): Promise<IResponse<MediaEntity>> => {
    const localContent = await this.local.get(id);

    if (localContent.data != null) {
      if (!isOlderThan(currentDate(), localContent.data.updatedAt, 2 * 24)) {
        return localContent;
      }
    }

    return await this.fetchFromRemote(id);
  };
}
