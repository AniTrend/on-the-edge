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
import { transform } from './tranformer.ts';

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

    if (relation?.thetvdb) {
      skyhook = await this.skyhook.show(
        relation?.thetvdb,
      );
    }
    if (skyhook?.slug) {
      trakt = await this.trakt.show(
        skyhook?.slug,
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

    return await transform(relation, skyhook, tmdb, themes, notify, mal, trakt);
  };
}
