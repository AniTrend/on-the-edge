import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals, assertExists } from '@std/assert';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { JikanService } from '@scope/service/jikan';
import { createMockLogger, createMockSecret } from '@scope/common/testing';

describe('JikanService', () => {
  const config = createMockSecret({
    MAL: 'https://mal.test',
    CLIENT_REQUEST_TIMEOUT: '5000',
  }).service;
  const { logger } = createMockLogger();

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

  it('getProducer fetches producer by MAL id', async () => {
    const producer = {
      data: {
        mal_id: 1,
        url: 'https://mal.test/anime/producer/1',
        titles: [{ type: 'Default', title: 'Toei Animation' }],
        images: { jpg: { image_url: 'https://cdn.test/p1.jpg' } },
        favorites: 1000,
        established: '1948-01-23T00:00:00+00:00',
        about: 'A major anime studio.',
        count: 300,
      },
    };

    mockFetch('https://mal.test/v4/producers/1', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(producer),
    });

    const service = new JikanService(config, logger);
    const result = await service.getProducer(1);

    assertEquals(result?.mal_id, 1);
    assertEquals(result?.titles[0].title, 'Toei Animation');
    assertEquals(result?.count, 300);
  });

  it('getProducerByKeyword returns first match from search', async () => {
    const searchResponse = {
      pagination: { has_next_page: false, last_visible_page: 1 },
      data: [
        {
          mal_id: 2,
          url: 'https://mal.test/anime/producer/2',
          titles: [{ type: 'Default', title: 'Kyoto Animation' }],
          images: { jpg: { image_url: 'https://cdn.test/p2.jpg' } },
          favorites: 5000,
          established: '1981-01-01T00:00:00+00:00',
          about: 'Known for high quality animation.',
          count: 50,
        },
      ],
    };

    mockFetch('https://mal.test/v4/producers?q=KyotoAnimation&limit=5', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(searchResponse),
    });

    const service = new JikanService(config, logger);
    const result = await service.getProducerByKeyword('KyotoAnimation');

    assertEquals(result?.mal_id, 2);
    assertEquals(result?.titles[0].title, 'Kyoto Animation');
  });

  it('getPerson fetches person by MAL id', async () => {
    const person = {
      data: {
        mal_id: 10,
        url: 'https://mal.test/people/10',
        website_url: null,
        images: { jpg: { image_url: 'https://cdn.test/person10.jpg' } },
        name: 'Hayao Miyazaki',
        given_name: 'Hayao',
        family_name: 'Miyazaki',
        alternate_names: [],
        birthday: '1941-01-05T00:00:00+00:00',
        favorites: 20000,
        about: 'Director and co-founder of Studio Ghibli.',
      },
    };

    mockFetch('https://mal.test/v4/people/10', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(person),
    });

    const service = new JikanService(config, logger);
    const result = await service.getPerson(10);

    assertEquals(result?.mal_id, 10);
    assertEquals(result?.name, 'Hayao Miyazaki');
    assertEquals(result?.given_name, 'Hayao');
  });

  it('getPersonByKeyword returns first match from search', async () => {
    const searchResponse = {
      pagination: { has_next_page: false, last_visible_page: 1 },
      data: [
        {
          mal_id: 11,
          url: 'https://mal.test/people/11',
          website_url: null,
          images: { jpg: { image_url: null } },
          name: 'Isao Takahata',
          given_name: 'Isao',
          family_name: 'Takahata',
          alternate_names: [],
          birthday: '1935-10-29T00:00:00+00:00',
          favorites: 8000,
          about: 'Director and co-founder of Studio Ghibli.',
        },
      ],
    };

    mockFetch('https://mal.test/v4/people?q=IsaoTakahata&limit=5', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(searchResponse),
    });

    const service = new JikanService(config, logger);
    const result = await service.getPersonByKeyword('IsaoTakahata');

    assertEquals(result?.mal_id, 11);
    assertEquals(result?.name, 'Isao Takahata');
  });

  it('getCharacter fetches character by MAL id with relations', async () => {
    const character = {
      data: {
        mal_id: 1,
        url: 'https://mal.test/character/1',
        images: {
          jpg: {
            image_url: 'https://cdn.test/character1.jpg',
            small_image_url: null,
            large_image_url: null,
          },
          webp: {
            image_url: 'https://cdn.test/character1.webp',
            small_image_url: 'https://cdn.test/character1t.webp',
            large_image_url: null,
          },
        },
        name: 'Spike Spiegel',
        name_kanji: 'スパイク・スピーゲル',
        nicknames: ['Spike'],
        favorites: 48836,
        about: 'Bounty hunter aboard the Bebop.',
        anime: [
          {
            role: 'Main',
            anime: {
              mal_id: 1,
              url: 'https://mal.test/anime/1',
              images: {
                jpg: {
                  image_url: 'https://cdn.test/anime1.jpg',
                  small_image_url: null,
                  large_image_url: null,
                },
                webp: {
                  image_url: 'https://cdn.test/anime1.webp',
                  small_image_url: null,
                  large_image_url: null,
                },
              },
              title: 'Cowboy Bebop',
            },
          },
        ],
        manga: [
          {
            role: 'Main',
            manga: {
              mal_id: 173,
              url: 'https://mal.test/manga/173',
              images: {
                jpg: {
                  image_url: 'https://cdn.test/manga173.jpg',
                  small_image_url: null,
                  large_image_url: null,
                },
                webp: {
                  image_url: 'https://cdn.test/manga173.webp',
                  small_image_url: null,
                  large_image_url: null,
                },
              },
              title: 'Cowboy Bebop',
            },
          },
        ],
        voices: [
          {
            person: {
              mal_id: 11,
              url: 'https://mal.test/people/11',
              images: {
                jpg: { image_url: 'https://cdn.test/person11.jpg' },
              },
              name: 'Yamadera, Kouichi',
            },
            language: 'Japanese',
          },
        ],
      },
    };

    mockFetch('https://mal.test/v4/characters/1/full', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(character),
    });

    const service = new JikanService(config, logger);
    const result = await service.getCharacter(1);

    assertExists(result);
    assertEquals(result?.mal_id, 1);
    assertEquals(result?.name, 'Spike Spiegel');
    assertEquals(result.anime?.length ?? 0, 1);
    assertEquals(result.voices?.[0]?.language ?? null, 'Japanese');
  });

  it('getCharacterByKeyword returns first match from search', async () => {
    const searchResponse = {
      pagination: { has_next_page: false, last_visible_page: 1 },
      data: [
        {
          mal_id: 2,
          url: 'https://mal.test/character/2',
          images: {
            jpg: {
              image_url: 'https://cdn.test/character2.jpg',
              small_image_url: null,
              large_image_url: null,
            },
            webp: {
              image_url: 'https://cdn.test/character2.webp',
              small_image_url: null,
              large_image_url: null,
            },
          },
          name: 'Faye Valentine',
          name_kanji: null,
          nicknames: [],
          favorites: 32000,
          about: 'A bounty hunter with a mysterious past.',
        },
      ],
    };

    mockFetch('https://mal.test/v4/characters?q=FayeValentine&limit=5', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(searchResponse),
    });

    const service = new JikanService(config, logger);
    const result = await service.getCharacterByKeyword('FayeValentine');

    assertExists(result);
    assertEquals(result?.mal_id, 2);
    assertEquals(result?.name, 'Faye Valentine');
    assertEquals(result.anime?.length ?? 0, 0);
  });

  it('getAnime with staff:true includes staff_list', async () => {
    const anime = {
      data: {
        mal_id: 300,
        url: 'https://mal.test/anime/300',
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
        titles: [{ title: 'Test Anime', type: 'Default' }],
        title: 'Test Anime',
        title_english: null,
        title_japanese: null,
        title_synonyms: [],
        type: 'TV',
        score: 7,
        scored_by: 1,
        rank: 1,
        popularity: 1,
        members: 1,
        favorites: 1,
        synopsis: null,
        background: null,
        rating: null,
        moreinfo: null,
        trailer: null,
        source: 'Original',
        episodes: 1,
        status: 'Finished Airing',
        airing: false,
        aired: {
          from: '2020-04-01T00:00:00Z',
          to: '2020-06-30T00:00:00Z',
          prop: {
            from: { day: 1, month: 4, year: 2020 },
            to: { day: 30, month: 6, year: 2020 },
            string: 'Apr 1, 2020 to Jun 30, 2020',
          },
        },
        duration: '24m',
        season: 'spring',
        year: 2020,
        broadcast: {
          day: 'Wednesdays',
          time: '00:00',
          timezone: 'JST',
          string: 'Wednesdays at 00:00 (JST)',
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
        staff_list: [],
      },
    };

    const staffResponse = {
      data: [
        {
          person: {
            mal_id: 5,
            url: 'https://mal.test/people/5',
            images: { jpg: { image_url: null } },
            name: 'Some Director',
          },
          positions: ['Director'],
        },
      ],
    };

    const moreinfo = { data: { moreinfo: null } };

    mockFetch('https://mal.test/v4/anime/300/full', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(anime),
    });

    mockFetch('https://mal.test/v4/anime/300/moreinfo', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(moreinfo),
    });

    mockFetch('https://mal.test/v4/anime/300/staff', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(staffResponse),
    });

    const service = new JikanService(config, logger);
    const result = await service.getAnime(300, { staff: true });

    assertEquals(result?.mal_id, 300);
    assertEquals(result?.staff_list?.length, 1);
    assertEquals(result?.staff_list?.[0].person.name, 'Some Director');
    assertEquals(result?.staff_list?.[0].positions, ['Director']);
  });
});
