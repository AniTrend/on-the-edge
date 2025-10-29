import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { assertSpyCalls } from '@std/testing/mock';
import { TheXemService } from '@scope/service/thexem';
import { createSecretStub } from '@scope/secret/testing';
import { createLoggerStub } from '@scope/logger/testing';
import { createCacheStub } from '@scope/cache/testing';
import type { TheXem } from '@scope/service/thexem';

describe('TheXemService', () => {
  const secret = createSecretStub({
    THEXEM: 'https://thexem.test',
    THEXEM_TTL_HOURS: '1',
    CLIENT_REQUEST_TIMEOUT: '5000',
  });

  const cache = createCacheStub();
  const { logger, spies } = createLoggerStub();

  beforeEach(() => {
    resetFetch();
  });

  afterEach(() => {
    resetFetch();
  });

  it('builds tvdb absolute map', () => {
    const service = new TheXemService(secret, logger, cache);
    const rows: TheXem[] = [
      {
        scene: { season: 1, episode: 1, absolute: 1 },
        tvdb: { season: 1, episode: 1, absolute: 1 },
        anidb: { season: 1, episode: 1, absolute: 1 },
      },
      {
        scene: { season: 1, episode: 2, absolute: 2 },
        tvdb: { season: 1, episode: 2, absolute: 2 },
        anidb: { season: 1, episode: 2, absolute: 2 },
      },
    ];

    const map = service.buildTvdbAbsoluteMap(rows);
    assertEquals(map.get(1), 1);
    assertEquals(map.get(2), 2);
  });

  it('builds season episode to absolute map', () => {
    const service = new TheXemService(secret, logger, cache);
    const rows: TheXem[] = [
      {
        scene: { season: 1, episode: 1, absolute: 1 },
        tvdb: { season: 1, episode: 1, absolute: 1 },
        anidb: { season: 1, episode: 1, absolute: 1 },
      },
      {
        scene: { season: 0, episode: 1, absolute: 5 },
        tvdb: { season: 0, episode: 1, absolute: 5 },
        anidb: { season: 0, episode: 1, absolute: 5 },
      },
    ];

    const map = service.buildTvdbSeasonEpisodeToAbsoluteMap(rows);
    assertEquals(map.get('1-1'), 1);
    assertEquals(map.get('0-1'), 5);
  });

  it('fetches mappings and caches subsequent lookups', async () => {
    const response = {
      result: 'success',
      message: 'ok',
      data: [
        {
          scene: { season: 1, episode: 1, absolute: 1 },
          tvdb: { season: 1, episode: 1, absolute: 1 },
          anidb: { season: 1, episode: 1, absolute: 1 },
        },
      ],
    };

    mockFetch(
      {
        url: 'https://thexem.test/map/all?origin=tvdb&id=123',
      },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(response),
      },
    );

    const service = new TheXemService(secret, logger, cache);
    const first = await service.getMappingsByTvdb(123);
    resetFetch();

    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = () => {
        throw new Error('cache should avoid network requests');
      };
      const second = await service.getMappingsByTvdb(123);
      assertEquals(second.length, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }

    assertEquals(first.length, 1);
  });

  it('returns empty array when id is missing', async () => {
    const service = new TheXemService(secret, logger, cache);
    const result = await service.getMappingsByTvdb();
    assertEquals(result, []);
    assertSpyCalls(spies.warn, 1);
  });
});
