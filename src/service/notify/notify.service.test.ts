import { afterEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { NotifyService } from '@scope/service/notify';
import { createSecretStub } from '@scope/secret/testing';
import { createLoggerStub } from '@scope/logger/testing';

describe('NotifyService', () => {
  const config = createSecretStub({
    NOTIFY: 'https://notify.test',
    CLIENT_REQUEST_TIMEOUT: '5000',
  });
  const { logger } = createLoggerStub();

  afterEach(() => {
    resetFetch();
  });

  it('fetches and transforms anime with episodes', async () => {
    const anime = {
      id: 'notify-1',
      type: 'tv',
      title: {
        canonical: 'Series',
        romaji: 'Series',
        english: 'Series',
        japanese: 'シリーズ',
        hiragana: 'しりーず',
        synonyms: ['Alias'],
      },
      summary: 'Summary',
      status: 'current',
      genres: [],
      startDate: '2023-01-01T00:00:00Z',
      endDate: '2023-06-01T00:00:00Z',
      episodeCount: 1,
      episodeLength: 24,
      source: 'manga',
      image: {
        extension: '.jpg',
        averageColor: { hue: 0, saturation: 50, lightness: 50 },
      },
      rating: {
        overall: 10,
        story: 9,
        visuals: 8,
        soundtrack: 7,
        count: { overall: 1, story: 1, visuals: 1, soundtrack: 1 },
      },
      popularity: {
        watching: 100,
        completed: 50,
        planned: 75,
        hold: 10,
        dropped: 5,
      },
      trailers: [{ service: 'youtube', serviceId: 'abc' }],
      episodes: ['ep-1'],
      mappings: [{ service: 'anilist/series', serviceId: '1' }],
      posts: null,
      likes: null,
      created: '2023-01-01T00:00:00Z',
      createdBy: 'user',
      edited: '2023-01-02T00:00:00Z',
      editedBy: 'user',
      isDraft: false,
      studios: [],
      producers: [],
      licensors: [],
      links: [],
      firstChannel: 'tv',
    };

    const episode = {
      id: 'ep-1',
      animeId: 'notify-1',
      number: 1,
      title: { english: 'Episode 1', romaji: 'Ep 1', japanese: '第1話' },
      airingDate: {
        start: '2023-01-01T00:00:00Z',
        end: '2023-01-02T00:00:00Z',
      },
      links: {},
    };

    mockFetch(
      'https://notify.test/api/anime/notify-1',
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(anime),
      },
    );

    mockFetch(
      'https://notify.test/api/episode/ep-1',
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(episode),
      },
    );

    const service = new NotifyService(config, logger);
    const result = await service.getAnime('notify-1', { withEpisodes: true });

    assertEquals(result?.id, 'notify-1');
    assertEquals(result?.episodes.length, 1);
    assertEquals(result?.episodes[0].number, 1);
    assertEquals(result?.mediaId.anilist, '1');
  });
});
