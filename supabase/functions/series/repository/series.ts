import { IResponse } from '../../_shared/types/response.d.ts';
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
import LocalSource from '../local/index.ts';
import SeasonRepository from './season.ts';
import { seasonTransformer } from '../transformer/season.ts';
import { Theme } from '../service/theme/transformer/types.d.ts';
import { SkyhookShow } from '../service/skyhook/types.d.ts';
import { Show } from '../service/trakt/transformer/types.d.ts';
import { TmdbShow } from '../service/tmdb/types.d.ts';
import { AnimeRelationId } from '../service/arm/types.d.ts';
import { MergedSeason } from '../transformer/types.d.ts';
import { currentDate, isOlderThan } from '../../_shared/core/utils.ts';

export default class SeriesRepository {
  constructor(
    private readonly local: LocalSource,
    private readonly repository: SeasonRepository,
  ) {}

  private fetchFromRemote = async (
    anilist: number,
  ): Promise<MediaWithSeason> => {
    const relation = await getAniListRelationId(anilist);

    const notify = await getNotifyAnime(relation?.notify);

    const mal = await getJikanAnime(relation?.myanimelist);

    let themes: Theme[] | undefined,
      skyhook: SkyhookShow | undefined,
      trakt: Show | undefined,
      tmdb: TmdbShow | undefined,
      relations: AnimeRelationId[],
      seasons: MergedSeason[] | undefined;
    if (!isManga(mal?.type)) {
      themes = await getThemesForAnime(relation?.myanimelist);
      skyhook = await getSkyhookShow(relation?.thetvdb);
      relations = await getRelationsByTvdb(skyhook?.tvdbId);
      trakt = await getTraktShow(relation?.animePlanet ?? skyhook?.slug);
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

  getById = async (anilist: number): Promise<IResponse<MediaWithSeason>> => {
    const localContent = await this.local.get(anilist);

    if (localContent.data != null) {
      if (!isOlderThan(currentDate(), localContent.data.updatedAt, 2 * 24)) {
        return localContent;
      }
    }

    const remoteContent = await this.fetchFromRemote(anilist);

    return {
      data: remoteContent,
    };
  };
}
