import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { TraktService } from '@scope/service/trakt';
import {
  createMockCache,
  createMockLogger,
  createMockSecret,
} from '@scope/common/testing';

describe('TraktService', () => {
  const config = createMockSecret({
    TRAKT: 'https://trakt.test',
    TRAKT_ID: 'trakt-key',
    CLIENT_REQUEST_TIMEOUT: '5000',
  }).service;
  const { logger } = createMockLogger();
  const { service, cache } = createMockCache();

  beforeEach(() => {
    resetFetch();
    cache.clear();
  });

  afterEach(() => {
    resetFetch();
  });

  it('fetches and transforms trakt show data', async () => {
    const show = {
      title: 'Sample Show',
      year: 2024,
      ids: {
        trakt: 100,
        slug: 'sample-show',
        tvdb: 200,
        imdb: 'tt123',
        tmdb: 300,
        tvrage: null,
      },
      tagline: 'Tagline',
      overview: 'Overview',
      first_aired: '2024-01-01T00:00:00Z',
      airs: { day: 'Monday', time: '20:00', timezone: 'UTC' },
      runtime: 24,
      certification: 'PG',
      network: 'Network',
      country: 'US',
      trailer: 'https://trailers.test/sample',
      homepage: 'https://example.test',
      status: 'returning series',
      rating: 8.5,
      votes: 100,
      comment_count: 10,
      updated_at: '2024-03-01T00:00:00Z',
      language: 'en',
      available_translations: ['en'],
      genres: ['action'],
      aired_episodes: 12,
      original_title: null,
    };

    mockFetch('https://trakt.test/shows/sample-show?extended=full', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(show),
    });

    const trakt = new TraktService(config, logger, service);
    const result = await trakt.getShow('sample-show');

    assertEquals(result?.ids.slug, 'sample-show');
    assertEquals(result?.runtime, 24);
    assertEquals(result?.status, 'returning series');
  });

  it('parses seasons when episodes provide null numeric fields', async () => {
    const seasons = [
      {
        number: 1,
        ids: {
          trakt: 10,
          slug: 'sample-show-1',
          tvdb: null,
          imdb: null,
          tmdb: null,
          tvrage: null,
        },
        first_aired: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        episodes: [
          {
            season: 1,
            number: 1,
            title: 'Pilot',
            ids: {
              trakt: 101,
              slug: 'sample-show-1-1',
              tvdb: null,
              imdb: null,
              tmdb: null,
              tvrage: null,
            },
            overview: null,
            first_aired: '2024-01-01T00:00:00Z',
            number_abs: null,
            runtime: null,
            updated_at: '2024-01-02T00:00:00Z',
          },
        ],
      },
    ];

    mockFetch(
      'https://trakt.test/shows/sample-show/seasons?extended=episodes',
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(seasons),
      },
    );

    const trakt = new TraktService(config, logger, service);
    const result = await trakt.getSeasons('sample-show', {
      extended: 'episodes',
    });

    assertEquals(result?.[0].episodes?.[0].number_abs, 0);
    assertEquals(result?.[0].episodes?.[0].runtime, 0);
  });
});
