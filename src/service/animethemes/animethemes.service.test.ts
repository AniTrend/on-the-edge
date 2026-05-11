import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { assertSpyCalls } from '@std/testing/mock';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { AnimeThemesService } from '@scope/service/animethemes';
import {
  createMockCache,
  createMockLogger,
  createMockSecret,
} from '@scope/common/testing';
import type { AnimeThemesLookupModel } from './animethemes.types.ts';

const lookupUrl = (malId: number) =>
  'https://animethemes.test/anime?' +
  `filter%5Bhas%5D=resources&filter%5Bsite%5D=MyAnimeList&filter%5Bexternal_id%5D=${malId}&` +
  'page%5Bsize%5D=1&include=animethemes.animethemeentries.videos.audio%2Canimethemes.song';

describe('AnimeThemesService', () => {
  const secret = createMockSecret({
    ANIME_THEMES: 'https://animethemes.test',
    CLIENT_REQUEST_TIMEOUT: '5000',
  }).service;
  const mockCache = createMockCache();

  const createService = () => {
    const { logger, spies } = createMockLogger();
    return {
      service: new AnimeThemesService(secret, logger, mockCache.service),
      spies,
    };
  };
  beforeEach(() => {
    resetFetch();
    mockCache.cache.clear();
  });

  afterEach(() => {
    resetFetch();
  });

  it('constructs without requiring ANIME_THEMES until it is used', () => {
    const noAnimeThemesSecret = createMockSecret({
      CLIENT_REQUEST_TIMEOUT: '5000',
    }).service;
    const { logger } = createMockLogger();

    const service = new AnimeThemesService(
      noAnimeThemesSecret,
      logger,
      mockCache.service,
    );

    assertEquals(service instanceof AnimeThemesService, true);
  });

  it('queries AnimeThemes by MAL id and returns raw lookup model', async () => {
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

    const expected: AnimeThemesLookupModel = payload as AnimeThemesLookupModel;
    assertEquals(result, expected);
  });

  it('returns an empty lookup when no AnimeThemes anime matches the MAL id', async () => {
    mockFetch(lookupUrl(37521), {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ anime: [] }),
    });

    const { service } = createService();
    const result = await service.getThemesForAnime(37521);

    assertEquals(result, { anime: [] });
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

  it('returns cached AnimeThemes lookup when available', async () => {
    const cached: AnimeThemesLookupModel = {
      anime: [{
        id: 1,
        name: 'Cached Series',
        slug: 'cached-series',
        year: 2024,
        season: 'Spring',
        media_format: 'TV',
        animethemes: [],
      }],
    };
    await mockCache.service.set('edge:animethemes:anime:37521', cached, {
      ttl: 60 * 60 * 4,
    });
    const getCallsBefore = mockCache.spies.get.calls.length;
    const setCallsBefore = mockCache.spies.set.calls.length;

    const { service } = createService();
    const result = await service.getThemesForAnime(37521);

    assertEquals(result, cached);
    assertEquals(mockCache.spies.get.calls.length - getCallsBefore, 1);
    assertEquals(mockCache.spies.set.calls.length - setCallsBefore, 0);
  });
});
