import { afterEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { AniListService } from '@scope/service/anilist';
import { createMockLogger, createMockSecret } from '@scope/common/testing';

describe('AniListService', () => {
  const config = createMockSecret({
    ANILIST: 'https://anilist.test',
    CLIENT_REQUEST_TIMEOUT: '5000',
  }).service;
  const { logger } = createMockLogger();

  afterEach(() => {
    resetFetch();
  });

  it('fetches media by AniList id', async () => {
    mockFetch('https://anilist.test/', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        data: {
          Media: {
            id: 210201,
            idMal: 12345,
            type: 'MANGA',
            title: {
              english: 'Edge Manga',
              romaji: 'Edge Manga',
              native: null,
            },
          },
        },
      }),
    });

    const service = new AniListService(config, logger);
    const result = await service.getMediaById(210201, 'MANGA');

    assertEquals(result?.id, 210201);
    assertEquals(result?.idMal, 12345);
    assertEquals(result?.type, 'MANGA');
  });

  it('returns undefined when media is null', async () => {
    mockFetch('https://anilist.test/', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: { Media: null } }),
    });

    const service = new AniListService(config, logger);
    const result = await service.getMediaById(210201, 'MANGA');

    assertEquals(result, undefined);
  });

  it('returns undefined when AniList returns invalid response', async () => {
    mockFetch('https://anilist.test/', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: { Media: 'invalid' } }),
    });

    const service = new AniListService(config, logger);
    const result = await service.getMediaById(210201, 'MANGA');

    assertEquals(result, undefined);
  });
});
