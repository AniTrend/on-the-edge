import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { ArmService } from '@scope/service/arm';
import { createMockLogger, createMockSecret } from '@scope/common/testing';

describe('ArmService', () => {
  const config = createMockSecret({
    YUNA: 'https://arm.test',
    CLIENT_REQUEST_TIMEOUT: '5000',
  }).service;
  const { logger } = createMockLogger();

  beforeEach(() => {
    resetFetch();
  });

  afterEach(() => {
    resetFetch();
  });

  it('fetches and transforms anilist relation', async () => {
    const payload = {
      anidb: 1,
      anilist: 300,
      imdb: 'tt123',
      themoviedb: 555,
      thetvdb: 999,
      myanimelist: 42,
    };

    mockFetch('https://arm.test/api/v2/ids?source=anilist&id=300', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const service = new ArmService(config, logger);
    const result = await service.getAniListRelationId(300);

    assertEquals(result?.anilist, 300);
    assertEquals(result?.thetvdb, 999);
    assertEquals(result?.imdb, 'tt123');
  });

  it('fetches relations by tvdb id with fallback on malformed json', async () => {
    const payload = [
      {
        anidb: 10,
        anilist: 20,
        imdb: 'tt456',
        themoviedb: 30,
        thetvdb: 40,
        myanimelist: 50,
      },
      {
        anidb: 11,
        anilist: 21,
        imdb: 'tt789',
        themoviedb: 31,
        thetvdb: 41,
        myanimelist: 51,
      },
    ];

    mockFetch('https://arm.test/api/v2/thetvdb?id=1234', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const service = new ArmService(config, logger);
    const result = await service.getRelationsByTvdb(1234);

    assertEquals(result.length, 2);
    assertEquals(result[0].anilist, 20);
    assertEquals(result[1].imdb, 'tt789');
  });

  it('returns undefined when ids lookup responds with null', async () => {
    mockFetch('https://arm.test/api/v2/ids?source=anilist&id=12373', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: 'null',
    });

    const service = new ArmService(config, logger);
    const result = await service.getRelationsById('anilist', 12373);

    assertEquals(result, undefined);
  });
});
