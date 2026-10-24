import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { assertSpyCalls } from '@std/testing/mock';
import type { CacheService } from '@scope/cache';
import { TheXemService } from '@scope/service/thexem';
import {
  createMockCache,
  createMockLogger,
  createMockSecret,
} from '@scope/common/testing';
import type { TheXem } from '@scope/service/thexem';

describe('TheXemService', () => {
  const secret = createMockSecret({
    THEXEM: 'https://thexem.test',
    THEXEM_TTL_HOURS: '1',
    CLIENT_REQUEST_TIMEOUT: '5000',
  }).service;

  const { service: cache } = createMockCache();
  const { logger } = createMockLogger();

  beforeEach(() => {
    resetFetch();
  });

  afterEach(() => {
    resetFetch();
  });

  it('builds tvdb absolute map', () => {
    const service = new TheXemService(cache, secret, logger);
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

  it('keeps scene then AniDB then TVDB preference when AniDB is absent', () => {
    const service = new TheXemService(cache, secret, logger);
    const rows: TheXem[] = [
      {
        scene: { season: 1, episode: 1, absolute: 11 },
        tvdb: { season: 1, episode: 1, absolute: 13 },
        anidb: { season: 1, episode: 1, absolute: 12 },
      },
      {
        scene: { season: 2, episode: 1, absolute: 0 },
        tvdb: { season: 2, episode: 1, absolute: 23 },
        anidb: { season: 2, episode: 1, absolute: 22 },
      },
      {
        scene: { season: 3, episode: 1, absolute: 0 },
        tvdb: { season: 3, episode: 1, absolute: 33 },
      },
    ];

    const absolute = service.buildTvdbAbsoluteMap(rows);
    const seasonEpisode = service.buildTvdbSeasonEpisodeToAbsoluteMap(rows);

    assertEquals(absolute.get(13), 11);
    assertEquals(absolute.get(23), 22);
    assertEquals(absolute.get(33), 33);
    assertEquals(seasonEpisode.get('1-1'), 11);
    assertEquals(seasonEpisode.get('2-1'), 22);
    assertEquals(seasonEpisode.get('3-1'), 33);
  });

  it('builds season episode to absolute map', () => {
    const service = new TheXemService(cache, secret, logger);
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

    const service = new TheXemService(cache, secret, logger);
    const first = await service.getMappingsByTvdb(123);
    resetFetch();
    const second = await service.getMappingsByTvdb(123);
    assertEquals(second.length, 1);

    assertEquals(first.length, 1);
  });

  it('caches a validated successful empty mapping result', async () => {
    const { service: emptyResultCache, spies: cacheSpies } = createMockCache();
    mockFetch(
      'https://thexem.test/map/all?origin=tvdb&id=456',
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ result: 'success', data: [] }),
      },
    );

    const service = new TheXemService(emptyResultCache, secret, logger);
    assertEquals(await service.getMappingsByTvdb(456), []);
    assertEquals(cacheSpies.set.calls[0].args[0], 'edge:thexem:mappings:456');
    assertEquals(cacheSpies.set.calls[0].args[2], { ttl: 24 * 60 * 60 });

    resetFetch();
    assertEquals(await service.getMappingsByTvdb(456), []);
    assertSpyCalls(cacheSpies.set, 1);
  });

  it('does not cache missing, failed, unknown, or malformed results', async () => {
    const responses: unknown[] = [
      { data: [] },
      { result: 'failure' },
      { result: 'failure', data: [] },
      { result: 'unexpected', data: [] },
      { result: 'success' },
      { result: 'success', data: {} },
      {
        result: 'success',
        data: [{
          scene: { season: 1, episode: 1, absolute: 1 },
          tvdb: {},
          anidb: null,
        }],
      },
    ];

    for (const [index, response] of responses.entries()) {
      resetFetch();
      const tvdbId = 600 + index;
      const { service: resultCache, spies: cacheSpies } = createMockCache();
      const { logger: responseLogger, spies: loggerSpies } = createMockLogger();
      mockFetch(
        `https://thexem.test/map/all?origin=tvdb&id=${tvdbId}`,
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(response),
        },
      );

      const service = new TheXemService(resultCache, secret, responseLogger);
      assertEquals(await service.getMappingsByTvdb(tvdbId), []);
      assertSpyCalls(cacheSpies.set, 0);
      assertSpyCalls(loggerSpies.warn, 1);
    }
  });

  it('retries after an upstream failure instead of caching the fallback', async () => {
    const { service: retryCache, spies: cacheSpies } = createMockCache();
    const service = new TheXemService(retryCache, secret, logger);
    mockFetch(
      'https://thexem.test/map/all?origin=tvdb&id=789',
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ result: 'failure', data: [] }),
      },
    );
    assertEquals(await service.getMappingsByTvdb(789), []);
    assertSpyCalls(cacheSpies.set, 0);

    resetFetch();
    mockFetch(
      'https://thexem.test/map/all?origin=tvdb&id=789',
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          result: 'success',
          data: [{
            scene: { season: 1, episode: 1, absolute: 1 },
            tvdb: { season: 1, episode: 1, absolute: 1 },
          }],
        }),
      },
    );
    const mappings = await service.getMappingsByTvdb(789);
    assertEquals(mappings.length, 1);
    assertEquals(mappings[0].anidb, undefined);
    assertSpyCalls(cacheSpies.set, 1);
  });

  it('does not cache a transport failure', async () => {
    const { service: failedCache, spies: cacheSpies } = createMockCache();
    const { logger: failureLogger, spies: loggerSpies } = createMockLogger();
    mockFetch(
      'https://thexem.test/map/all?origin=tvdb&id=987',
      { status: 500, body: 'unavailable' },
    );

    const service = new TheXemService(failedCache, secret, failureLogger);
    assertEquals(await service.getMappingsByTvdb(987), []);
    assertSpyCalls(cacheSpies.set, 0);
    assertSpyCalls(loggerSpies.warn, 1);
  });

  it('preserves fetched mappings when cache writing fails', async () => {
    mockFetch(
      'https://thexem.test/map/all?origin=tvdb&id=654',
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          result: 'success',
          data: [{
            scene: { season: 1, episode: 1, absolute: 1 },
            tvdb: { season: 1, episode: 1, absolute: 1 },
          }],
        }),
      },
    );
    const failingCache = {
      get: async () => null,
      set: async () => {
        throw new Error('cache unavailable');
      },
    } as unknown as CacheService;
    const { logger: testLogger, spies: loggerSpies } = createMockLogger();
    const service = new TheXemService(failingCache, secret, testLogger);

    const result = await service.getMappingsByTvdb(654);

    assertEquals(result.length, 1);
    assertSpyCalls(loggerSpies.warn, 1);
  });

  it('returns empty array when id is missing', async () => {
    const { logger: missingIdLogger, spies: missingIdSpies } =
      createMockLogger();
    const service = new TheXemService(cache, secret, missingIdLogger);
    const result = await service.getMappingsByTvdb();
    assertEquals(result, []);
    assertSpyCalls(missingIdSpies.warn, 1);
  });
});
