import { IResponse } from '../../common/types/response.d.ts';
import {
  getAniListRelationId,
  getRelationsByTvdb,
} from '../service/arm/index.ts';
import { getJikanAnime } from '../service/jikan/index.ts';
import { getNotifyAnime } from '../service/notify/index.ts';
import { getSkyhookShow } from '../service/skyhook/index.ts';
import { getThemesForAnime } from '../service/theme/index.ts';
import { getTmdbShow } from '../service/tmdb/index.ts';
import { getTraktShow } from '../service/trakt/index.ts';
import { seriesTransform } from '../transformer/series.ts';
import { MediaWithSeason } from '../types.d.ts';
import { isManga } from '../utils/index.ts';
import LocalSource from '../local/source.ts';
import SeasonRepository from './season.ts';
import { seasonTransformer } from '../transformer/season.ts';
import { Theme } from '../service/theme/transformer/types.d.ts';
import { SkyhookShow } from '../service/skyhook/types.d.ts';
import { Show } from '../service/trakt/transformer/types.d.ts';
import { TmdbShow } from '../service/tmdb/types.d.ts';
import { AnimeRelationId } from '../service/arm/types.d.ts';
import { MergedSeason } from '../transformer/types.d.ts';
import { currentDate, isOlderThan } from '../../common/core/utils.ts';
import { MediaParamId } from '../local/index.ts';

export default class SeriesRepository {
  constructor(
    private readonly local: LocalSource,
    private readonly repository: SeasonRepository,
  ) {}

  private fetchFromRemote = async (
    id: MediaParamId,
  ): Promise<MediaWithSeason> => {
    const relation = await getAniListRelationId(id.anilist);

    const [notify, mal] = await Promise.all([
      getNotifyAnime(relation?.notify),
      getJikanAnime(relation?.myanimelist),
    ]);

    let themes: Theme[] | undefined,
      skyhook: SkyhookShow | undefined,
      trakt: Show | undefined,
      tmdb: TmdbShow | undefined,
      relations: AnimeRelationId[],
      seasons: MergedSeason[] | undefined;
    if (!isManga(mal?.type)) {
      [themes, skyhook] = await Promise.all([
        getThemesForAnime(relation?.myanimelist),
        getSkyhookShow(relation?.thetvdb),
      ]);
      [relations, trakt] = await Promise.all([
        getRelationsByTvdb(skyhook?.tvdbId),
        getTraktShow(relation?.animePlanet ?? skyhook?.slug),
      ]);

      tmdb = await getTmdbShow(relation?.themoviedb ?? trakt?.mediaId.tmdb);

      seasons = await this.repository.getSeasons(
        notify,
        skyhook,
        tmdb,
        relations,
      );
    }

    const result: MediaWithSeason = {
      ...seriesTransform(
        relation,
        skyhook,
        tmdb,
        themes,
        notify,
        mal,
        trakt,
      ),
      seasons: seasonTransformer(seasons),
    };

    await this.local.save(result);
    return result;
  };

  getById = async (id: MediaParamId): Promise<IResponse<MediaWithSeason>> => {
    const localContent = await this.local.get(id);

    if (localContent.data != null) {
      if (!isOlderThan(currentDate(), localContent.data.updatedAt, 2 * 24)) {
        return localContent;
      }
    }

    const remoteContent = await this.fetchFromRemote(id);

    return {
      data: remoteContent,
    };
  };
}
