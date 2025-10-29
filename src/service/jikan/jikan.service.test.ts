import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { JikanService } from '@scope/service/jikan';
import { createSecretStub } from '@scope/secret/testing';
import { createLoggerStub } from '@scope/logger/testing';

describe('JikanService', () => {
  const config = createSecretStub({
    MAL: 'https://mal.test',
    CLIENT_REQUEST_TIMEOUT: '5000',
  });
  const { logger } = createLoggerStub();

  beforeEach(() => {
    resetFetch();
  });

  afterEach(() => {
    resetFetch();
  });

  it('fetches anime with episodes and moreinfo', async () => {
    const anime = {
      data: {
        mal_id: 100,
        url: 'https://mal.test/anime/100',
        approved: true,
        images: {
          jpg: {
            image_url: null,
            small_image_url: null,
            large_image_url: null,
          },
          webp: {
            image_url: null,
            small_image_url: null,
            large_image_url: null,
          },
        },
        titles: [{ title: 'Series', type: 'Default' }],
        title: 'Series',
        title_english: 'Series',
        title_japanese: 'シリーズ',
        title_synonyms: [],
        type: 'TV',
        score: 8.5,
        scored_by: 1,
        rank: 1,
        popularity: 1,
        members: 1,
        favorites: 1,
        synopsis: 'Summary',
        background: null,
        rating: 'PG',
        moreinfo: null,
        trailer: null,
        source: 'Manga',
        episodes: 1,
        status: 'Finished Airing',
        airing: false,
        aired: {
          from: '2023-01-01T00:00:00Z',
          to: '2023-02-01T00:00:00Z',
          prop: {
            from: { day: 1, month: 1, year: 2023 },
            to: { day: 1, month: 2, year: 2023 },
            string: 'Jan 1, 2023 to Feb 1, 2023',
          },
        },
        duration: '24m',
        season: 'winter',
        year: 2023,
        broadcast: {
          day: 'Mondays',
          time: '18:00',
          timezone: 'JST',
          string: 'Mondays at 18:00 (JST)',
        },
        theme: { openings: [], endings: [] },
        producers: [],
        licensors: [],
        studios: [],
        genres: [],
        explicit_genres: [],
        themes: [],
        demographics: [],
        relations: [],
        external: [],
        streaming: [],
        episodes_list: [],
        episodes_truncated: false,
      },
    };

    const episodes = {
      data: [
        {
          mal_id: 1,
          url: 'https://mal.test/anime/100/episode/1',
          title: 'Episode 1',
          title_japanese: '第1話',
          title_romanji: 'Dai 1 Wa',
          duration: 24,
          aired: '2023-01-01T00:00:00Z',
          filler: false,
          recap: false,
          score: null,
          synopsis: 'Pilot',
        },
      ],
      pagination: { has_next_page: false },
    };

    const moreinfo = {
      data: {
        moreinfo: 'Additional info',
      },
    };

    mockFetch('https://mal.test/v4/anime/100/full', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(anime),
    });

    mockFetch('https://mal.test/v4/anime/100/moreinfo', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(moreinfo),
    });

    mockFetch('https://mal.test/v4/anime/100/episodes?page=1', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(episodes),
    });

    const service = new JikanService(config, logger);
    const result = await service.getAnime(100, { episodes: true });

    assertEquals(result?.mal_id, 100);
    assertEquals(result?.episodes_list?.length, 1);
    assertEquals(result?.moreinfo, 'Additional info');
  });

  it('fetches manga and applies moreinfo', async () => {
    const manga = {
      data: {
        mal_id: 200,
        url: 'https://mal.test/manga/200',
        approved: true,
        images: {
          jpg: {
            image_url: null,
            small_image_url: null,
            large_image_url: null,
          },
          webp: {
            image_url: null,
            small_image_url: null,
            large_image_url: null,
          },
        },
        titles: [{ title: 'Manga', type: 'Default' }],
        title: 'Manga',
        title_english: 'Manga',
        title_japanese: 'マンガ',
        title_synonyms: [],
        type: 'Manga',
        score: 9,
        scored_by: 1,
        rank: 1,
        popularity: 1,
        members: 1,
        favorites: 1,
        synopsis: 'Manga summary',
        background: null,
        rating: null,
        moreinfo: '',
        chapters: 10,
        volumes: 2,
        status: 'Finished',
        publishing: false,
        published: {
          from: '2020-01-01',
          to: '2021-01-01',
          prop: {
            from: { day: 1, month: 1, year: 2020 },
            to: { day: 1, month: 1, year: 2021 },
            string: '2020 to 2021',
          },
        },
        authors: [],
        serializations: [],
        genres: [],
        explicit_genres: [],
        themes: [],
        demographics: [],
        relations: [],
        external: [],
        source: 'Manga',
      },
    };

    const moreinfo = {
      data: {
        moreinfo: 'Manga details',
      },
    };

    mockFetch('https://mal.test/v4/manga/200/full', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(manga),
    });

    mockFetch('https://mal.test/v4/manga/200/moreinfo', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(moreinfo),
    });

    const service = new JikanService(config, logger);
    const result = await service.getManga(200);

    assertEquals(result?.mal_id, 200);
    assertEquals(result?.moreinfo, 'Manga details');
  });
});
