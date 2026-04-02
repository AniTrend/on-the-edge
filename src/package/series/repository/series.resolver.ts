import { TraktService, TraktShow } from '@scope/service/trakt';
import { TmdbMovie, TmdbService, TmdbShow } from '@scope/service/tmdb';
import { SkyhookService, SkyhookShow } from '@scope/service/skyhook';
import { NotifyAnime, NotifyService } from '@scope/service/notify';
import { JikanAnime, JikanManga, JikanService } from '@scope/service/jikan';
import { ArmService, SeriesRelationId } from '@scope/service/arm';
import {
  AniListMedia,
  AniListMediaType,
  AniListService,
} from '@scope/service/anilist';
import { TheXem, TheXemService } from '@scope/service/thexem';
import { Theme, ThemeService } from '@scope/service/theme';
import { LoggerService } from '@scope/logger';
import { Injectable } from '@danet/core';
import { MediaUnion, SeriesQuery } from '../series.types.ts';
import { isAnime } from './helpers/qualifier.ts';
import { seriesTransform } from '../transformer/series.transformer.ts';
import { SeriesNotFoundError } from '../series.errors.ts';

@Injectable()
export class SeriesResolver {
  constructor(
    private readonly trakt: TraktService,
    private readonly tmdb: TmdbService,
    private readonly skyhook: SkyhookService,
    private readonly notify: NotifyService,
    private readonly jikan: JikanService,
    private readonly arm: ArmService,
    private readonly anilist: AniListService,
    private readonly thexem: TheXemService,
    private readonly theme: ThemeService,
    private readonly logger: LoggerService,
  ) { }

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
    mediaType?: AniListMediaType,
  ): Promise<JikanAnime | JikanManga | undefined> => {
    if (!malId) {
      return undefined;
    }

    try {
      if (mediaType === 'MANGA') {
        return await this.jikan.getManga(malId);
      }

      return await this.jikan.getAnime(malId);
    } catch (error) {
      this.logger.instance.warn('Failed to fetch Jikan media', {
        malId,
        mediaType,
        error: (error as Error).message,
      });
      return undefined;
    }
  };

  private resolveAniList = async (
    anilistId?: number,
  ): Promise<AniListMedia | undefined> => {
    if (!anilistId) {
      return undefined;
    }

    try {
      const [manga, anime] = await Promise.all([
        this.anilist.getMediaById(anilistId, 'MANGA'),
        this.anilist.getMediaById(anilistId, 'ANIME'),
      ]);

      return manga ?? anime;
    } catch (error) {
      this.logger.instance.warn('Failed to fetch AniList media', {
        anilistId,
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

  private resolveThemes = async (malId: number | null) => {
    if (!malId) {
      return undefined;
    }
    try {
      return await this.theme.getThemesForAnime(malId);
    } catch (error) {
      this.logger.instance.warn('Failed to fetch themes', {
        malId,
        error: (error as Error).message,
      });
      return undefined;
    }
  };

  private createFallbackRelation(
    query: SeriesQuery,
    malId: number | null,
  ): SeriesRelationId | undefined {
    if (!query.anilist && !malId) {
      return undefined;
    }

    return {
      anidb: null,
      anilist: query.anilist ?? null,
      animePlanet: null,
      anisearch: null,
      imdb: null,
      kitsu: null,
      livechart: null,
      notify: null,
      themoviedb: null,
      thetvdb: null,
      myanimelist: malId,
    };
  }

  private hasAggregateData(
    relation?: SeriesRelationId,
    notify?: NotifyAnime,
    mal?: JikanAnime | JikanManga,
    themes?: Theme[],
    skyhook?: SkyhookShow,
    tmdb?: TmdbShow | TmdbMovie,
    trakt?: TraktShow,
  ): boolean {
    const hasProviderPayload = Boolean(
      notify || mal || skyhook || tmdb || trakt || (themes?.length ?? 0) > 0,
    );

    const hasCrossServiceIdentifiers = Boolean(
      relation?.myanimelist || relation?.notify || relation?.thetvdb ||
      relation?.themoviedb || relation?.animePlanet || relation?.imdb ||
      relation?.anidb || relation?.kitsu || relation?.livechart ||
      relation?.anisearch,
    );

    return hasProviderPayload || hasCrossServiceIdentifiers;
  }

  async resolve(param: SeriesQuery): Promise<MediaUnion> {
    this.logger.instance.info('Resolving aggregate data for series', {
      ...param,
    });

    const [relation, aniListMedia] = await Promise.all([
      this.resolveArm(param),
      this.resolveAniList(param.anilist),
    ]);

    const malId = relation?.myanimelist ?? param.mal ?? aniListMedia?.idMal ??
      null;
    const aggregateRelation = relation ??
      this.createFallbackRelation(param, malId);

    const [notify, mal] = await Promise.all([
      this.resolveNotify(relation?.notify),
      this.resolveJikan(malId, aniListMedia?.type),
    ]);

    let themes: Theme[] | undefined,
      skyhook: SkyhookShow | undefined,
      trakt: TraktShow | undefined,
      tmdb: TmdbShow | TmdbMovie | undefined;

    const shouldResolveAnimeSources = isAnime(mal?.type) ||
      aniListMedia?.type === 'ANIME';
    if (shouldResolveAnimeSources) {
      [themes, skyhook] = await Promise.all([
        this.resolveThemes(aggregateRelation?.myanimelist ?? null),
        this.resolveSkyhook(aggregateRelation?.thetvdb),
      ]);
      [trakt] = await Promise.all([
        this.resolveTrakt(aggregateRelation?.animePlanet ?? skyhook?.slug),
      ]);

      tmdb = await this.resolveTmdb(
        mal?.type === 'Movie' ? 'movie' : 'tv',
        aggregateRelation?.themoviedb ?? trakt?.ids.tmdb,
      );
    }

    if (
      !this.hasAggregateData(
        aggregateRelation,
        notify,
        mal,
        themes,
        skyhook,
        tmdb,
        trakt,
      )
    ) {
      throw new SeriesNotFoundError();
    }

    return seriesTransform(
      aggregateRelation,
      skyhook,
      tmdb,
      themes,
      notify,
      mal,
      trakt,
    );
  }
}
