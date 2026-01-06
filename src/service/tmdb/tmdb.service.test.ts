import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { TmdbService } from '@scope/service/tmdb';
import { createMockLogger, createMockSecret } from '@scope/common/testing';
import { createMockCache } from '@scope/common/testing';

describe('TmdbService', () => {
  const config = createMockSecret({
    TMDB: 'https://tmdb.test',
    TMDB_KEY: 'key-123',
    CLIENT_REQUEST_TIMEOUT: '5000',
  }).service;
  const { logger } = createMockLogger();
  const mockCache = createMockCache();
  const cache = mockCache.service;

  beforeEach(() => {
    resetFetch();
    mockCache.cache.clear();
  });

  afterEach(() => {
    resetFetch();
  });

  it('fetches show and applies image transforms', async () => {
    const configuration = {
      change_keys: [],
      images: {
        base_url: 'http://image.tmdb.org/t/p/',
        secure_base_url: 'https://image.tmdb.org/t/p/',
        backdrop_sizes: ['w300', 'w780', 'w1280', 'original'],
        logo_sizes: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original'],
        poster_sizes: [
          'w45',
          'w92',
          'w154',
          'w185',
          'w300',
          'w500',
          'original',
        ],
        profile_sizes: ['w45', 'w185', 'h632', 'original'],
        still_sizes: ['w92', 'w185', 'w300', 'original'],
      },
    };

    const show = {
      adult: false,
      backdrop_path: '/backdrop.jpg',
      episode_run_time: [24],
      first_air_date: '2024-01-01',
      genres: [{ id: 1, name: 'Action' }],
      homepage: 'https://example.test',
      id: 100,
      in_production: false,
      languages: ['en'],
      last_air_date: '2024-02-01',
      last_episode_to_air: {
        id: 1,
        name: 'Finale',
        overview: 'End',
        vote_average: 9,
        vote_count: 100,
        air_date: '2024-02-01',
        episode_number: 12,
        production_code: 'P',
        runtime: 24,
        season_number: 1,
        show_id: 100,
        still_path: '/still.jpg',
      },
      name: 'Sample Show',
      next_episode_to_air: null,
      networks: [{
        id: 1,
        logo_path: '/logo.png',
        name: 'Net',
        origin_country: 'US',
      }],
      number_of_episodes: 12,
      number_of_seasons: 1,
      origin_country: ['US'],
      original_language: 'en',
      original_name: 'Sample Show',
      overview: 'Overview',
      popularity: 100,
      poster_path: '/poster.jpg',
      production_companies: [{
        id: 2,
        logo_path: '/company.png',
        name: 'Studio',
        origin_country: 'US',
      }],
      production_countries: [{ iso_3166_1: 'US', name: 'United States' }],
      seasons: [{
        air_date: '2024-01-01',
        episode_count: 12,
        id: 200,
        name: 'Season 1',
        overview: 'Season',
        poster_path: '/season.jpg',
        season_number: 1,
        episodes: [],
        images: {
          backdrops: [],
          logos: [],
          posters: [],
        },
      }],
      spoken_languages: [{
        english_name: 'English',
        iso_639_1: 'en',
        name: 'English',
      }],
      status: 'Ended',
      tagline: 'Tagline',
      type: 'Scripted',
      vote_average: 9,
      vote_count: 100,
      images: {
        backdrops: [{
          aspect_ratio: 1,
          height: 720,
          iso_639_1: null,
          file_path: '/backdrop-detail.jpg',
          vote_average: 5,
          vote_count: 10,
          width: 1280,
        }],
        logos: [{
          aspect_ratio: 1,
          height: 80,
          iso_639_1: null,
          file_path: '/logo-detail.png',
          vote_average: 5,
          vote_count: 10,
          width: 300,
        }],
        posters: [{
          aspect_ratio: 1,
          height: 1000,
          iso_639_1: null,
          file_path: '/poster-detail.jpg',
          vote_average: 5,
          vote_count: 10,
          width: 500,
        }],
      },
    };

    mockFetch('https://tmdb.test/3/configuration?api_key=key-123', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(configuration),
    });

    mockFetch(
      'https://tmdb.test/3/tv/100?api_key=key-123&append_to_response=images',
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(show),
      },
    );

    const service = new TmdbService(config, logger, cache);
    await service.onAppBootstrap();
    const result = await service.getShow(100);

    assertEquals(result?.id, 100);
    assertEquals(
      result?.backdrop_path,
      'https://image.tmdb.org/t/p/original/backdrop.jpg',
    );
    assertEquals(
      result?.images.backdrops?.[0]?.file_path?.includes('image.tmdb.org'),
      true,
    );
  });

  it('fetches season data', async () => {
    const configuration = {
      change_keys: [],
      images: {
        base_url: 'http://image.tmdb.org/t/p/',
        secure_base_url: 'https://image.tmdb.org/t/p/',
        backdrop_sizes: ['w300', 'w780', 'w1280', 'original'],
        logo_sizes: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original'],
        poster_sizes: [
          'w45',
          'w92',
          'w154',
          'w185',
          'w300',
          'w500',
          'original',
        ],
        profile_sizes: ['w45', 'w185', 'h632', 'original'],
        still_sizes: ['w92', 'w185', 'w300', 'original'],
      },
    };

    const season = {
      air_date: '2024-01-01',
      episode_count: 12,
      id: 200,
      name: 'Season 1',
      overview: 'Season overview',
      poster_path: '/season.jpg',
      season_number: 1,
      episodes: null,
      images: null,
    };

    mockFetch('https://tmdb.test/3/configuration?api_key=key-123', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(configuration),
    });

    mockFetch(
      'https://tmdb.test/3/tv/100?api_key=key-123&append_to_response=images',
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...season,
          adult: false,
          backdrop_path: null,
          episode_run_time: [],
          first_air_date: '2024-01-01',
          genres: [],
          homepage: '',
          id: 100,
          in_production: false,
          languages: [],
          last_air_date: '2024-01-01',
          last_episode_to_air: {
            id: 1,
            name: 'Pilot',
            overview: '',
            vote_average: 0,
            vote_count: 0,
            air_date: '2024-01-01',
            episode_number: 1,
            production_code: '',
            runtime: 24,
            season_number: 1,
            show_id: 100,
            still_path: null,
          },
          name: 'Show',
          next_episode_to_air: null,
          networks: [],
          number_of_episodes: 12,
          number_of_seasons: 1,
          origin_country: [],
          original_language: 'en',
          original_name: 'Show',
          overview: '',
          popularity: 0,
          poster_path: null,
          production_companies: [],
          production_countries: [],
          seasons: [],
          spoken_languages: [],
          status: 'Ended',
          tagline: '',
          type: 'Scripted',
          vote_average: 0,
          vote_count: 0,
          images: { backdrops: [], logos: [], posters: [] },
        }),
      },
    );

    mockFetch(
      'https://tmdb.test/3/tv/100/season/1?api_key=key-123&append_to_response=images',
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(season),
      },
    );

    const service = new TmdbService(config, logger, cache);
    await service.onAppBootstrap();
    await service.getShow(100); // load configuration
    const result = await service.getSeason(1, 100);

    assertEquals(result?.id, 200);
    assertEquals(result?.season_number, 1);
  });
});
