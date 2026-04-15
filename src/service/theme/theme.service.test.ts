import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import {
  createMockExperiment,
  createMockLogger,
  createMockSecret,
} from '@scope/common/testing';
import { ThemeService } from '@scope/service/theme';
import type { AnimeThemesService } from '@scope/service/animethemes';

const legacyLookupUrl = (malId: number) =>
  `https://themes.test/api/themes/${malId}`;

describe('ThemeService', () => {
  beforeEach(() => {
    resetFetch();
  });

  afterEach(() => {
    resetFetch();
  });

  it('uses the legacy THEMES compatibility path when the GrowthBook flag is off', async () => {
    mockFetch(legacyLookupUrl(37521), {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([
        {
          malID: 37521,
          name: 'Vinland Saga',
          year: 2019,
          season: 'summer',
          themes: [
            {
              themeType: 'OP1',
              themeName: 'MUKANJYO',
              mirror: {
                mirrorURL:
                  'https://animethemes.moe/video/VinlandSaga-OP1-NCBD1080.webm',
                priority: 1,
                notes: null,
              },
            },
          ],
        },
      ]),
    });

    const secret = createMockSecret({
      THEMES: 'https://themes.test',
      CLIENT_REQUEST_TIMEOUT: '5000',
    }).service;
    const { logger } = createMockLogger();
    const experiment = createMockExperiment({
      'enable-animethemes-api': false,
    });
    const getThemesForAnime = spy(async (_malId: number) => {
      return [
        {
          id: 'OP1',
          name: 'unused',
          video: 'https://animethemes.moe/video/unused.webm',
          audio: null,
          meta: {
            type: 'OP' as const,
            number: 1,
            version: 1,
          },
        },
      ];
    });
    const animeThemes = {
      getThemesForAnime,
    } as unknown as AnimeThemesService;

    const service = new ThemeService(secret, logger, experiment, animeThemes);
    const result = await service.getThemesForAnime(37521);

    assertEquals(result, [
      {
        id: 'OP1',
        name: 'MUKANJYO',
        video: 'https://animethemes.moe/video/VinlandSaga-OP1-NCBD1080.webm',
        audio: 'https://themes.test/themes/37521/OP1/audio',
        meta: {
          type: 'OP',
          number: 1,
          version: 1,
        },
      },
    ]);
    assertSpyCalls(getThemesForAnime, 0);
  });

  it('uses AnimeThemes when the GrowthBook flag is on', async () => {
    const themes = [
      {
        id: 'OP1',
        name: 'MUKANJYO',
        video: 'https://animethemes.moe/video/VinlandSaga-OP1.webm',
        audio: null,
        meta: {
          type: 'OP' as const,
          number: 1,
          version: 1,
        },
      },
    ];
    const secret = createMockSecret({
      CLIENT_REQUEST_TIMEOUT: '5000',
    }).service;
    const { logger } = createMockLogger();
    const experiment = createMockExperiment({
      'enable-animethemes-api': true,
    });
    const getThemesForAnime = spy(async (_malId: number) => themes);
    const animeThemes = {
      getThemesForAnime,
    } as unknown as AnimeThemesService;

    const service = new ThemeService(secret, logger, experiment, animeThemes);
    const result = await service.getThemesForAnime(37521);

    assertEquals(result, themes);
    assertSpyCalls(getThemesForAnime, 1);
    assertEquals(getThemesForAnime.calls[0]?.args, [37521]);
  });
});
