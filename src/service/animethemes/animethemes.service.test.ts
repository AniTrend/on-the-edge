import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { assertSpyCalls } from '@std/testing/mock';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { AnimeThemesService } from '@scope/service/animethemes';
import { createMockLogger, createMockSecret } from '@scope/common/testing';

const lookupUrl = (malId: number) =>
  'https://animethemes.test/anime?' +
  `filter%5Bhas%5D=resources&filter%5Bsite%5D=MyAnimeList&filter%5Bexternal_id%5D=${malId}&` +
  'page%5Bsize%5D=1&include=animethemes.animethemeentries.videos.audio%2Canimethemes.song';

describe('AnimeThemesService', () => {
  const secret = createMockSecret({
    ANIME_THEMES: 'https://animethemes.test',
    CLIENT_REQUEST_TIMEOUT: '5000',
  }).service;

  const createService = () => {
    const { logger, spies } = createMockLogger();
    return {
      service: new AnimeThemesService(secret, logger),
      spies,
    };
  };

  beforeEach(() => {
    resetFetch();
  });

  afterEach(() => {
    resetFetch();
  });

  it('constructs without requiring ANIME_THEMES until it is used', () => {
    const noAnimeThemesSecret = createMockSecret({
      CLIENT_REQUEST_TIMEOUT: '5000',
    }).service;
    const { logger } = createMockLogger();

    const service = new AnimeThemesService(noAnimeThemesSecret, logger);

    assertEquals(service instanceof AnimeThemesService, true);
  });

  it('queries AnimeThemes by MAL id and returns flattened themes', async () => {
    const payload = {
      anime: [
        {
          id: 1,
          name: 'Vinland Saga',
          slug: 'vinland-saga',
          year: 2019,
          season: 'Summer',
          media_format: 'TV',
          animethemes: [
            {
              id: 11,
              type: 'OP',
              sequence: 1,
              slug: 'vinland-saga-op1',
              song: { id: 21, title: 'MUKANJYO' },
              animethemeentries: [
                {
                  id: 31,
                  version: 1,
                  episodes: null,
                  nsfw: false,
                  spoiler: false,
                  notes: null,
                  videos: [
                    {
                      id: 41,
                      link:
                        'https://animethemes.moe/video/VinlandSaga-OP1.webm',
                      resolution: 1080,
                      nc: false,
                      subbed: false,
                      lyrics: false,
                      uncen: false,
                      source: 'WEB',
                      overlap: 'None',
                      tags: '',
                      audio: null,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    mockFetch(lookupUrl(37521), {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const { service } = createService();
    const result = await service.getThemesForAnime(37521);

    assertEquals(result, [
      {
        id: 'OP1',
        name: 'MUKANJYO',
        video: 'https://animethemes.moe/video/VinlandSaga-OP1.webm',
        audio: null,
        meta: {
          type: 'OP',
          number: 1,
          version: 1,
        },
      },
    ]);
  });

  it('returns an empty array when no AnimeThemes anime matches the MAL id', async () => {
    mockFetch(lookupUrl(37521), {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ anime: [] }),
    });

    const { service } = createService();
    const result = await service.getThemesForAnime(37521);

    assertEquals(result, []);
  });

  it('returns undefined on validation errors from AnimeThemes', async () => {
    mockFetch(lookupUrl(37521), {
      status: 422,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: 'The selected filter.site is invalid.',
        errors: {
          'filter.site': ['The selected filter.site is invalid.'],
        },
      }),
    });

    const { service, spies } = createService();
    const result = await service.getThemesForAnime(37521);

    assertEquals(result, undefined);
    assertSpyCalls(spies.warn, 1);
  });

  it('returns undefined when AnimeThemes rate limits the request', async () => {
    mockFetch(lookupUrl(37521), {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': '60',
      },
      body: JSON.stringify({ message: 'Too Many Attempts.' }),
    });

    const { service, spies } = createService();
    const result = await service.getThemesForAnime(37521);

    assertEquals(result, undefined);
    assertSpyCalls(spies.warn, 1);
  });
});
