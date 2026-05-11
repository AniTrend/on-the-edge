import { TraktService, TraktShow } from '@scope/service/trakt';
import { TmdbMovie, TmdbService, TmdbShow } from '@scope/service/tmdb';
import { SkyhookService, SkyhookShow } from '@scope/service/skyhook';
import { NotifyAnime, NotifyService } from '@scope/service/notify';
import { JikanAnime, JikanManga, JikanService } from '@scope/service/jikan';
import { ArmService, SeriesRelationId } from '@scope/service/arm';
import { TheXem, TheXemService } from '@scope/service/thexem';
import { AnimeThemesService } from '@scope/service/animethemes';
import { ExperimentService } from '@scope/experiment';
import { LoggerService } from '@scope/logger';
import { Injectable } from '@danet/core';
import { MediaUnion, SeriesQuery } from '../series.types.ts';
import { isAnime } from './helpers/qualifier.ts';
import { seriesTransform } from '../transformer/series.transformer.ts';

@Injectable()
export class SeriesResolver {
  constructor(
    private readonly trakt: TraktService,
    private readonly tmdb: TmdbService,
    private readonly skyhook: SkyhookService,
    private readonly notify: NotifyService,
    private readonly jikan: JikanService,
    private readonly arm: ArmService,
    private readonly thexem: TheXemService,
    private readonly animeThemes: AnimeThemesService,
    private readonly experiment: ExperimentService,
    private readonly logger: LoggerService,
  ) {}

  private resolveTrakt = async (
    id?: string | number | null,
  ): Promise<TraktShow | undefined> => {
    if (!id) {
      return undefined;
    }
    try {
      return await this.trakt.getShow(id);
    } catch (error) {
      this.logger.instance.warn('Failed to fetch Trakt show', {
        id,
        error: (error as Error).message,
      });
      return undefined;
    }
  };

  private resolveTmdb = async (
    type: 'movie' | 'tv',
    id?: number | null,
  ): Promise<TmdbMovie | TmdbShow | undefined> => {
    if (!id) {
      return undefined;
    }
    try {
      if (type === 'movie') {
        return await this.tmdb.getMovie(id);
      } else {
        return await this.tmdb.getShow(id);
      }
    } catch (error) {
      this.logger.instance.warn('Failed to fetch TMDB data', {
        id,
        type,
        error: (error as Error).message,
      });
      return undefined;
    }
  };

  private resolveSkyhook = async (
    tvdb?: number | null,
  ): Promise<SkyhookShow | undefined> => {
    if (!tvdb) {
      return undefined;
    }
    try {
      return await this.skyhook.getShowByTvdb(tvdb);
    } catch (error) {
      this.logger.instance.warn('Failed to fetch Skyhook show', {
        tvdb,
        error: (error as Error).message,
      });
      return undefined;
    }
  };

  private resolveNotify = async (
    id?: string | null,
  ): Promise<NotifyAnime | undefined> => {
    if (!id) {
      return undefined;
    }
    try {
      return await this.notify.getAnime(id);
    } catch (error) {
      this.logger.instance.warn('Failed to fetch Notify anime', {
        id,
        error: (error as Error).message,
      });
      return undefined;
    }
  };

  private resolveJikan = async (
    malId?: number | null,
  ): Promise<JikanAnime | JikanManga | undefined> => {
    if (!malId) {
      return undefined;
    }
    try {
      return await this.jikan.getAnime(malId);
    } catch (error) {
      this.logger.instance.warn('Failed to fetch Jikan anime', {
        malId,
        error: (error as Error).message,
      });
      return undefined;
    }
  };

  private resolveArm = async (
    query: SeriesQuery,
  ): Promise<SeriesRelationId | undefined> => {
    const { anilist, mal } = query;
    try {
      if (anilist) {
        return await this.arm.getRelationsById('anilist', anilist);
      } else if (mal) {
        return await this.arm.getRelationsById('myanimelist', mal);
      }
      throw new Error('No valid identifier provided for ARM lookup');
    } catch (error) {
      this.logger.instance.warn('Failed to fetch Arm anime', {
        query,
        error,
      });
      return undefined;
    }
  };

  private resolveTheXem = async (
    tvdb: number | null,
  ): Promise<TheXem[] | undefined> => {
    if (!tvdb) {
      return undefined;
    }
    try {
      return await this.thexem.getMappingsByTvdb(tvdb);
    } catch (error) {
      this.logger.instance.warn('Failed to fetch TheXem anime', {
        tvdb,
        error: (error as Error).message,
      });
      return undefined;
    }
  };

  private resolveAnimeThemes = async (malId: number | null) => {
    if (!malId) {
      return undefined;
    }
    if (!this.experiment.isEnabled('enable-animethemes-api')) {
      this.logger.instance.info(
        'Skipping AnimeThemes fetch because feature flag is disabled',
        {
          malId,
        },
      );
      return undefined;
    }
    try {
      return await this.animeThemes.getThemesForAnime(malId);
    } catch (error) {
      this.logger.instance.warn('Failed to fetch AnimeThemes anime', {
        malId,
        error: (error as Error).message,
      });
      return undefined;
    }
  };

  async resolve(param: SeriesQuery): Promise<MediaUnion> {
    this.logger.instance.info('Resolving aggregate data for series', {
      ...param,
    });

    const relation = await this.resolveArm(param);

    if (!relation) {
      throw new Error('Series not found');
    }

    // Fetch Notify and Jikan in parallel as they are independent
    const [notify, mal] = await Promise.all([
      this.resolveNotify(relation?.notify),
      this.resolveJikan(relation?.myanimelist),
    ]);

    let animeThemes,
      skyhook: SkyhookShow | undefined,
      trakt: TraktShow | undefined,
      tmdb: TmdbShow | TmdbMovie | undefined;
    if (isAnime(mal?.type)) {
      [animeThemes, skyhook] = await Promise.all([
        this.resolveAnimeThemes(relation?.myanimelist),
        this.resolveSkyhook(relation?.thetvdb),
      ]);
      [trakt] = await Promise.all([
        this.resolveTrakt(relation?.animePlanet ?? skyhook?.slug),
      ]);

      tmdb = await this.resolveTmdb(
        mal?.type === 'Movie' ? 'movie' : 'tv',
        relation?.themoviedb ?? trakt?.ids.tmdb,
      );
    }

    return seriesTransform(
      relation,
      skyhook,
      tmdb,
      animeThemes,
      notify,
      mal,
      trakt,
    );
  }
}
