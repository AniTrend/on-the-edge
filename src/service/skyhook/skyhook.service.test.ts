import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals, assertExists } from '@std/assert';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { SkyhookService } from '@scope/service/skyhook';
import { createSecretStub } from '@scope/secret/testing';
import { createLoggerStub } from '@scope/logger/testing';

describe('SkyhookService', () => {
  const config = createSecretStub({
    SKYHOOK: 'https://skyhook.test',
    CLIENT_REQUEST_TIMEOUT: '5000',
  });
  const { logger } = createLoggerStub();

  beforeEach(() => {
    resetFetch();
  });

  afterEach(() => {
    resetFetch();
  });

  it('fetches and transforms a skyhook show', async () => {
    const remoteShow = {
      tvdbId: 1,
      title: 'Example',
      overview: 'desc',
      slug: 'example',
      originalCountry: 'US',
      originalLanguage: 'en',
      language: 'en',
      firstAired: '2023-01-01T00:00:00Z',
      lastAired: '2023-02-01T00:00:00Z',
      tvMazeId: 2,
      tmdbId: 3,
      imdbId: 'tt123',
      malIds: [4],
      aniListIds: [5],
      lastUpdated: '2023-02-02T00:00:00Z',
      status: 'running',
      runtime: 45,
      timeOfDay: { hours: 20, minutes: 30 },
      originalNetwork: 'network',
      network: 'network',
      genres: ['Action'],
      contentRating: 'PG-13',
      rating: { count: 1, value: '9' },
      alternativeTitles: [{ title: 'Alt' }],
      actors: [{
        name: 'Actor',
        character: 'Char',
        image: 'https://img/actor.jpg',
      }],
      images: [
        { coverType: 'Poster', url: 'https://img/poster.jpg' },
        { coverType: 'Banner', url: 'https://img/banner.jpg' },
        { coverType: 'Fanart', url: 'https://img/fanart.jpg' },
      ],
      seasons: [
        {
          seasonNumber: 1,
          name: 'Season 1',
          images: [
            { coverType: 'Poster', url: 'https://img/season-poster.jpg' },
          ],
        },
      ],
      episodes: [
        {
          tvdbShowId: 1,
          tvdbId: 11,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'Episode 1',
          airDate: '2023-01-01',
          airDateUtc: '2023-01-01T00:00:00Z',
        },
      ],
    };

    mockFetch(
      'https://skyhook.test/v1/tvdb/shows/en/123',
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(remoteShow),
      },
    );

    const service = new SkyhookService(config, logger);
    const result = await service.getShowByTvdb(123);

    assertExists(result);
    assertEquals(result.tvdbId, 1);
    assertEquals(result.poster, 'https://img/poster.jpg');
    assertEquals(result.banner, 'https://img/banner.jpg');
    assertEquals(result.seasons[0].poster, 'https://img/season-poster.jpg');
    assertEquals(
      result.firstAired,
      Math.floor(Date.parse('2023-01-01T00:00:00Z') / 1000),
    );
  });
});
