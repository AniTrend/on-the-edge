import { spy } from '@std/testing/mock';
import type { Spy } from '@std/testing/mock';
import type { TraktService, TraktShow } from '@scope/service/trakt';
import type { TmdbService, TmdbShow } from '@scope/service/tmdb';
import type { SkyhookService, SkyhookShow } from '@scope/service/skyhook';
import type { NotifyAnime, NotifyService } from '@scope/service/notify';
import type {
  JikanAnime,
  JikanFetchOptions,
  JikanService,
} from '@scope/service/jikan';
import type { ArmService, SeriesRelationId } from '@scope/service/arm';
import type { TheXem, TheXemService } from '@scope/service/thexem';
import { AnimeTheme, ThemeService } from '@scope/service/theme';

/**
 * Type-safe spy for TraktService.getShow
 */
export function createTraktSpy(
  impl?: (trakt?: number | string) => Promise<TraktShow | undefined>,
): Spy<
  TraktService,
  [trakt?: number | string],
  Promise<TraktShow | undefined>
> {
  return spy(impl ?? (async () => undefined));
}

/**
 * Type-safe spy for TmdbService.getShow
 */
export function createTmdbSpy(
  impl?: (tmdb?: number | null) => Promise<TmdbShow | undefined>,
): Spy<TmdbService, [tmdb?: number | null], Promise<TmdbShow | undefined>> {
  return spy(impl ?? (async () => undefined));
}

/**
 * Type-safe spy for SkyhookService.getShowByTvdb
 */
export function createSkyhookSpy(
  impl?: (tvdbId?: number) => Promise<SkyhookShow | undefined>,
): Spy<SkyhookService, [tvdbId?: number], Promise<SkyhookShow | undefined>> {
  return spy(impl ?? (async () => undefined));
}

/**
 * Type-safe spy for NotifyService.getAnime
 */
export function createNotifySpy(
  impl?: (id: string) => Promise<NotifyAnime | undefined>,
): Spy<NotifyService, [id: string], Promise<NotifyAnime | undefined>> {
  return spy(impl ?? (async () => undefined));
}

/**
 * Type-safe spy for JikanService.getAnime
 */
export function createJikanSpy(
  impl?: (
    mal?: number,
    options?: JikanFetchOptions,
  ) => Promise<JikanAnime>,
): Spy<
  JikanService,
  [mal?: number, options?: JikanFetchOptions],
  Promise<JikanAnime>
> {
  return spy(
    impl ?? (async () => {
      throw new Error('Not implemented');
    }),
  );
}

/**
 * Type-safe spy for ArmService.getAniListRelationId
 */
export function createArmAnilistSpy(
  impl?: (anilist?: number) => Promise<SeriesRelationId | undefined>,
): Spy<
  ArmService,
  [anilist?: number],
  Promise<SeriesRelationId | undefined>
> {
  return spy(impl ?? (async () => undefined));
}

/**
 * Type-safe spy for ArmService.getRelationsByTvdb
 */
export function createArmTvdbSpy(
  impl?: (tvdb?: number) => Promise<SeriesRelationId[]>,
): Spy<ArmService, [tvdb?: number], Promise<SeriesRelationId[]>> {
  return spy(impl ?? (async () => []));
}

/**
 * Type-safe spy for TheXemService.getMappingsByTvdb
 */
export function createTheXemSpy(
  impl?: (tvdbId?: number) => Promise<TheXem[]>,
): Spy<TheXemService, [tvdbId?: number], Promise<TheXem[]>> {
  return spy(impl ?? (async () => []));
}

/**
 * Type-safe spy for Themes.getThemesForAnime
 */
export function createThemesSpy(
  impl?: (tvdbId?: number) => Promise<AnimeTheme[]>,
): Spy<ThemeService, [tvdbId?: number], Promise<AnimeTheme[]>> {
  return spy(impl ?? (async () => []));
}

/**
 * Creates a complete set of service spies for testing SeriesRepository
 */
export function createServiceSpies() {
  const traktSpy = createTraktSpy();
  const tmdbSpy = createTmdbSpy();
  const skyhookSpy = createSkyhookSpy();
  const notifySpy = createNotifySpy();
  const jikanSpy = createJikanSpy();
  const armAnilistSpy = createArmAnilistSpy();
  const armTvdbSpy = createArmTvdbSpy();
  const thexemSpy = createTheXemSpy();
  const themeSpy = createThemesSpy();

  return {
    services: {
      trakt: {
        getShow: traktSpy,
      } as unknown as TraktService,
      tmdb: {
        getShow: tmdbSpy,
      } as unknown as TmdbService,
      skyhook: {
        getShowByTvdb: skyhookSpy,
      } as unknown as SkyhookService,
      notify: {
        getAnime: notifySpy,
      } as unknown as NotifyService,
      jikan: {
        getAnime: jikanSpy,
      } as unknown as JikanService,
      arm: {
        getRelationsByTvdb: armTvdbSpy,
        getAniListRelationId: armAnilistSpy,
      } as unknown as ArmService,
      thexem: {
        getMappingsByTvdb: thexemSpy,
      } as unknown as TheXemService,
      theme: {
        getThemesForAnime: themeSpy,
      } as unknown as ThemeService,
    },
    spies: {
      trakt: traktSpy,
      tmdb: tmdbSpy,
      skyhook: skyhookSpy,
      notify: notifySpy,
      jikan: jikanSpy,
      armAnilist: armAnilistSpy,
      armTvdb: armTvdbSpy,
      thexem: thexemSpy,
      themes: themeSpy,
    },
  };
}
