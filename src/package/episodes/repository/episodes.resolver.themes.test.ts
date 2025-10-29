import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertExists } from '@std/assert';
import { EpisodesResolver } from './episodes.resolver.ts';
import { toCanonicalEpisode } from '../transformer/canonical.ts';
import type { AnimeEpisode } from '@scope/service/jikan';
import type { JikanService } from '@scope/service/jikan';
import type { SkyhookService } from '@scope/service/skyhook';
import type { TmdbService } from '@scope/service/tmdb';
import type { TraktService } from '@scope/service/trakt';
import type { NotifyService } from '@scope/service/notify';
import type { ThemeService } from '@scope/service/theme';
import type { TheXemService } from '@scope/service/thexem';
import { createLoggerStub } from '@scope/logger/testing';
import type { ExperimentService } from '@scope/experiment';

function createTestEpisode(mal_id: number): AnimeEpisode {
  return {
    mal_id,
    url: `https://myanimelist.net/anime/episode/${mal_id}`,
    title: `Episode ${mal_id}`,
    title_japanese: null,
    title_romanji: null,
    duration: null,
    aired: null,
    score: null,
    filler: false,
    recap: false,
    synopsis: null,
    kind: 'main' as const,
  };
}

describe('EpisodesResolver themes enrichment', () => {
  it('enriches episodes with openings/endings when flag is enabled', async () => {
    const { logger } = createLoggerStub();

    const episodes = [toCanonicalEpisode(createTestEpisode(1))];

    const mockJikan: Partial<JikanService> = {
      // deno-lint-ignore require-await
      async getAnime(_malId: number) {
        const payload = {
          mal_id: 1,
          airing: false,
          episodes_list: episodes.map((ep) => ({
            mal_id: ep.id,
            title: ep.title?.english,
            title_japanese: ep.title?.native,
            title_romanji: ep.title?.romanji,
            synopsis: ep.synopsis,
            aired: ep.aired ? new Date(ep.aired * 1000).toISOString() : null,
            score: ep.score,
            url: ep.url,
            kind: ep.kind,
            duration: ep.duration,
            recap: false,
            filler: false,
          })),
        } as unknown;
        return payload as Awaited<ReturnType<JikanService['getAnime']>>;
      },
    };

    const mockTheme: Partial<ThemeService> = {
      // deno-lint-ignore require-await
      async getThemesForAnime(_mal: number) {
        return [
          {
            id: 'OP1',
            name: 'Opening 1',
            video: '',
            audio: null,
            meta: { type: 'OP', number: 1, version: 1 },
          },
          {
            id: 'ED1',
            name: 'Ending 1',
            video: '',
            audio: null,
            meta: { type: 'ED', number: 1, version: 1 },
          },
        ] as unknown as Awaited<ReturnType<ThemeService['getThemesForAnime']>>;
      },
    };

    const mockExperiment = {
      isEnabled: (k: unknown) => (k as string) === 'enable-themes-source',
      getFeatureValue: <T>(_k: unknown, defaultValue: T) => defaultValue,
    } as unknown as ExperimentService;

    const resolver = new EpisodesResolver(
      mockJikan as JikanService,
      {} as unknown as SkyhookService,
      {} as unknown as TmdbService,
      {} as unknown as TraktService,
      {} as unknown as NotifyService,
      mockTheme as ThemeService,
      {} as unknown as TheXemService,
      logger,
      mockExperiment,
      {} as unknown as import('@scope/service/arm').ArmService,
    );

    const result = await resolver.resolve(1, '1');
    assertExists(result.episodes[0].themes);
    assertEquals(result.episodes[0].themes?.openings, ['Opening 1']);
    assertEquals(result.episodes[0].themes?.endings, ['Ending 1']);
  });
});
