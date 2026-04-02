import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { createMockLogger } from '@scope/common/testing';
import { SeriesResolver } from './series.resolver.ts';
import type { TraktService } from '@scope/service/trakt';
import type { TmdbService } from '@scope/service/tmdb';
import type { SkyhookService } from '@scope/service/skyhook';
import type { NotifyService } from '@scope/service/notify';
import type { JikanManga, JikanService } from '@scope/service/jikan';
import type { ArmService } from '@scope/service/arm';
import type { AniListService } from '@scope/service/anilist';
import type { TheXemService } from '@scope/service/thexem';
import type { ThemeService } from '@scope/service/theme';
import { SeriesNotFoundError } from '../series.errors.ts';

describe('SeriesResolver', () => {
  const createResolver = (deps: {
    arm?: ArmService;
    anilist?: AniListService;
    jikan?: JikanService;
  }): SeriesResolver => {
    const { logger } = createMockLogger();

    const trakt = { getShow: async () => undefined } as unknown as TraktService;
    const tmdb = {
      getMovie: async () => undefined,
      getShow: async () => undefined,
    } as unknown as TmdbService;
    const skyhook = {
      getShowByTvdb: async () => undefined,
    } as unknown as SkyhookService;
    const notify = {
      getAnime: async () => undefined,
    } as unknown as NotifyService;
    const jikan = deps.jikan ?? {
      getAnime: async () => undefined,
      getManga: async () => undefined,
    } as unknown as JikanService;
    const arm = deps.arm ?? {
      getRelationsById: async () => undefined,
    } as unknown as ArmService;
    const anilist = deps.anilist ?? {
      getMediaById: async () => undefined,
    } as unknown as AniListService;
    const thexem = {
      getMappingsByTvdb: async () => [],
    } as unknown as TheXemService;
    const theme = {
      getThemesForAnime: async () => undefined,
    } as unknown as ThemeService;

    return new SeriesResolver(
      trakt,
      tmdb,
      skyhook,
      notify,
      jikan,
      arm,
      anilist,
      thexem,
      theme,
      logger,
    );
  };

  it('resolves manga payload when ARM mapping is missing and AniList provides MAL id', async () => {
    const manga = {
      mal_id: 12345,
      title: 'Edge Manga',
      title_english: 'Edge Manga',
      title_japanese: null,
      title_synonyms: [],
      type: 'Manga',
      images: {
        jpg: {
          image_url: 'cover.jpg',
          small_image_url: 'cover-sm.jpg',
          large_image_url: 'cover-lg.jpg',
        },
        webp: {
          image_url: 'cover.webp',
          small_image_url: 'cover-sm.webp',
          large_image_url: 'cover-lg.webp',
        },
      },
      synopsis: 'Fallback manga synopsis',
      moreinfo: null,
      chapters: null,
      volumes: null,
      published: {
        from: null,
        to: null,
      },
    } as unknown as JikanManga;

    const resolver = createResolver({
      arm: {
        getRelationsById: async () => undefined,
      } as unknown as ArmService,
      anilist: {
        getMediaById: async () => ({
          id: 210201,
          idMal: 12345,
          type: 'MANGA',
          title: {
            english: 'Edge Manga',
            romaji: 'Edge Manga',
            native: null,
          },
        }),
      } as unknown as AniListService,
      jikan: {
        getAnime: async () => undefined,
        getManga: async () => manga,
      } as unknown as JikanService,
    });

    const result = await resolver.resolve({ anilist: 210201 });

    assertEquals(result.kind, 'MANGA');
    assertEquals(result.mediaId.anilist, 210201);
    assertEquals(result.mediaId.myanimelist, 12345);
    assertEquals(result.title.canonical, 'Edge Manga');
  });

  it('throws SeriesNotFoundError when ARM and AniList fallback cannot resolve data', async () => {
    const resolver = createResolver({
      arm: {
        getRelationsById: async () => undefined,
      } as unknown as ArmService,
      anilist: {
        getMediaById: async () => ({
          id: 210201,
          idMal: null,
          type: 'MANGA',
          title: {
            english: null,
            romaji: null,
            native: null,
          },
        }),
      } as unknown as AniListService,
      jikan: {
        getAnime: async () => undefined,
        getManga: async () => undefined,
      } as unknown as JikanService,
    });

    await assertRejects(
      () => resolver.resolve({ anilist: 210201 }),
      SeriesNotFoundError,
      'Series not found',
    );
  });
});
