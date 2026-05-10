import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals, assertExists } from '@std/assert';
import { EpisodesRepository } from './episodes.repository.ts';
import { EpisodesResolver } from './episodes.resolver.ts';
import { InMemoryCollection } from '@scope/database/testing';
import { createMockLogger } from '@scope/common/testing';
import type { EpisodeDocument } from '../episodes.document.ts';
import { toCanonicalEpisode } from '../transformer/canonical.ts';
import {
  buildFilterHash,
  decodeCursor,
  encodeCursor,
} from './helpers/index.ts';
import type { AnimeEpisode, JikanService } from '@scope/service/jikan';
import type { SkyhookService } from '@scope/service/skyhook';
import type { TmdbService } from '@scope/service/tmdb';
import type { TraktService } from '@scope/service/trakt';
import type { NotifyService } from '@scope/service/notify';
import type { TheXemService } from '@scope/service/thexem';
import type { MongoService } from '@scope/database';
import type { EpisodeKind } from '../episodes.types.ts';

/**
 * Create a complete AnimeEpisode test object with required fields
 */
function createTestEpisode(
  partial: Partial<AnimeEpisode> & { mal_id: number },
): AnimeEpisode {
  return {
    mal_id: partial.mal_id,
    url: partial.url ??
      `https://myanimelist.net/anime/episode/${partial.mal_id}`,
    title: partial.title ?? `Episode ${partial.mal_id}`,
    title_japanese: partial.title_japanese ?? null,
    title_romanji: partial.title_romanji ?? null,
    duration: partial.duration ?? null,
    aired: partial.aired ?? null,
    score: partial.score ?? null,
    filler: partial.filler ?? false,
    recap: partial.recap ?? false,
    synopsis: partial.synopsis ?? null,
    kind: (partial as { kind?: EpisodeKind }).kind ?? 'main',
  };
}

// Mock Jikan Service for offline testing
class MockJikanService {
  private readonly mockData = new Map<
    number,
    {
      airing: boolean;
      episodes: ReturnType<typeof toCanonicalEpisode>[];
    }
  >();

  setMockData(
    malId: number,
    data: {
      airing: boolean;
      episodes: ReturnType<typeof toCanonicalEpisode>[];
    },
  ) {
    this.mockData.set(malId, data);
  }

  async getAnime(malId: number, _opts?: unknown) {
    const data = this.mockData.get(malId);
    if (!data) return undefined;

    return {
      mal_id: malId,
      airing: data.airing,
      episodes_list: data.episodes.map((ep) => ({
        mal_id: ep.id,
        title: ep.title?.english,
        title_japanese: ep.title?.native,
        title_romanji: ep.title?.romanji,
        synopsis: ep.synopsis,
        aired: ep.aired ? new Date(ep.aired * 1000).toISOString() : null,
        score: ep.score,
        url: ep.url,
        kind: ep.kind,
        duration: ep.duration,
        recap: false,
        filler: false,
      })),
    };
  }
}

// Mock MongoService
class MockMongoService {
  constructor(private memoryCollection: InMemoryCollection<EpisodeDocument>) { }

  // deno-lint-ignore no-explicit-any
  collection<T>(_name: string): any {
    return this.memoryCollection;
  }
}

describe('EpisodesRepository', () => {
  let collection: InMemoryCollection<EpisodeDocument>;
  let mockJikan: MockJikanService;
  let mockMongo: MockMongoService;
  let resolver: EpisodesResolver;
  let repository: EpisodesRepository;
  const { logger } = createMockLogger();

  beforeEach(() => {
    collection = new InMemoryCollection<EpisodeDocument>();
    mockJikan = new MockJikanService();
    mockMongo = new MockMongoService(collection);

    // Create resolver with all dependencies (most are unused stubs)
    resolver = new EpisodesResolver(
      mockJikan as unknown as JikanService,
      {} as unknown as SkyhookService,
      {} as unknown as TmdbService,
      {} as unknown as TraktService,
      {} as unknown as NotifyService,
      {} as unknown as TheXemService,
      logger,
      {
        isEnabled: () => false,
        getFeatureValue: (_k: unknown, v: unknown) => v,
      } as unknown as import('@scope/experiment').ExperimentService,
      {} as unknown as import('@scope/service/arm').ArmService,
    );

    repository = new EpisodesRepository(
      mockMongo as unknown as MongoService,
      resolver,
      logger,
    );
  });

  afterEach(() => {
    collection.clear();
  });

  describe('cursor encode/decode round trip', () => {
    it('should encode and decode cursor correctly', () => {
      const hash = buildFilterHash('123');
      const cursor = encodeCursor({ pos: 5, hash });
      const decoded = decodeCursor(cursor);

      assertExists(decoded);
      assertEquals(decoded?.pos, 5);
      assertEquals(decoded?.hash, hash);
    });
  });

  describe('pagination slicing forward', () => {
    it('should paginate episodes forward correctly', async () => {
      const malId = 999;
      const episodes = Array.from(
        { length: 10 },
        (_, i) =>
          toCanonicalEpisode(createTestEpisode({
            mal_id: i + 1,
          })),
      );

      mockJikan.setMockData(malId, { airing: false, episodes });

      // First page
      const firstPage = await repository.invoke(malId, { limit: 4 });
      assertExists(firstPage.data);
      assertEquals(firstPage.data.length, 4);
      assertEquals(firstPage.total, 10);

      // Second page using after cursor
      const secondPage = await repository.invoke(malId, {
        limit: 4,
        after: firstPage.last ?? undefined,
      });
      assertExists(secondPage.data);
      assertEquals(secondPage.data.length, 4);
      assertEquals(secondPage.data[0].id, 5); // Should start at next item
    });
  });

  describe('limit clamping', () => {
    it('should handle over-limit requests', async () => {
      const malId = 1001;
      const episodes = Array.from(
        { length: 60 },
        (_, i) =>
          toCanonicalEpisode(createTestEpisode({
            mal_id: i + 1,
          })),
      );

      mockJikan.setMockData(malId, { airing: false, episodes });

      const result = await repository.invoke(malId, { limit: 500 });
      assertExists(result.data);
      // Should return all available episodes (60) when limit exceeds available
      assertEquals(result.data.length, 60);
    });
  });

  describe('cursor hash mismatch behavior', () => {
    it('should ignore cursor with mismatched hash', async () => {
      const malId = 2002;
      const episodes = Array.from(
        { length: 5 },
        (_, i) =>
          toCanonicalEpisode(createTestEpisode({
            mal_id: i + 1,
          })),
      );

      mockJikan.setMockData(malId, { airing: false, episodes });

      // Create bogus cursor with wrong hash
      const wrongHash = buildFilterHash('different-series');
      const bogusCursor = encodeCursor({ pos: 2, hash: wrongHash });

      const page = await repository.invoke(malId, {
        limit: 2,
        after: bogusCursor,
      });
      assertExists(page.data);
      // Should start from beginning since hash mismatch
      assertEquals(page.data[0].id, 1);
      assertEquals(page.total, 5);
    });
  });

  describe('backward pagination using before cursor', () => {
    it('should paginate backward correctly', async () => {
      const malId = 3003;
      const episodes = Array.from(
        { length: 12 },
        (_, i) =>
          toCanonicalEpisode(createTestEpisode({
            mal_id: i + 1,
          })),
      );

      mockJikan.setMockData(malId, { airing: false, episodes });

      // Get first forward page
      const firstPage = await repository.invoke(malId, { limit: 5 });
      const secondPage = await repository.invoke(malId, {
        limit: 5,
        after: firstPage.last ?? undefined,
      });

      // Use before cursor from second page to go backward
      const beforeCursor = encodeCursor({
        pos: secondPage.first ? decodeCursor(secondPage.first)?.pos! : 5,
        hash: buildFilterHash(String(malId)),
      });

      const backwardPage = await repository.invoke(malId, {
        limit: 5,
        before: beforeCursor,
      });

      // Expect backward page to match first page data
      const backwardIds = backwardPage.data!.map((e) => e.id);
      const firstIds = firstPage.data!.map((e) => e.id);
      assertEquals(backwardIds, firstIds);
    });
  });

  describe('filter: kind only', () => {
    it('should filter episodes by kind', async () => {
      const malId = 5005;
      const episodes = [
        toCanonicalEpisode(createTestEpisode({
          mal_id: 1,
          kind: 'main',
        })),
        toCanonicalEpisode(createTestEpisode({
          mal_id: 2,
          kind: 'ova',
        })),
        toCanonicalEpisode(createTestEpisode({
          mal_id: 3,
          kind: 'main',
        })),
        toCanonicalEpisode(createTestEpisode({
          mal_id: 4,
          kind: 'ova',
        })),
        toCanonicalEpisode(createTestEpisode({
          mal_id: 5,
          kind: 'main',
        })),
      ];

      mockJikan.setMockData(malId, { airing: false, episodes });

      const result = await repository.invoke(malId, {
        limit: 10,
        filters: { kind: 'ova' },
      });

      assertEquals(result.data?.map((e) => e.id), [2, 4]);
      assertEquals(result.total, 2);
    });
  });

  describe('filter: specialsOnly', () => {
    it('should filter special episodes only', async () => {
      const malId = 6006;
      const episodes = [
        toCanonicalEpisode(createTestEpisode({
          mal_id: 1,
          kind: 'main',
        })),
        toCanonicalEpisode(createTestEpisode({
          mal_id: 2,
          kind: 'ova',
        })),
        toCanonicalEpisode(createTestEpisode({
          mal_id: 3,
          kind: 'ona',
        })),
        toCanonicalEpisode(createTestEpisode({
          mal_id: 4,
          kind: 'recap',
        })),
        toCanonicalEpisode(createTestEpisode({
          mal_id: 5,
          kind: 'filler',
        })),
        toCanonicalEpisode(createTestEpisode({
          mal_id: 7,
          kind: 'special',
        })),
        toCanonicalEpisode(createTestEpisode({
          mal_id: 6,
          kind: 'main',
        })),
      ];

      mockJikan.setMockData(malId, { airing: false, episodes });

      const result = await repository.invoke(malId, {
        limit: 10,
        filters: { specialsOnly: true },
      });

      assertExists(result.data);
      assertEquals(result.data.map((e) => e.id), [2, 3, 4, 5, 7]);
      assertEquals(result.total, 5);
    });
  });

  describe('filter: range with pagination', () => {
    it('should filter by range and paginate correctly', async () => {
      const malId = 7007;
      const episodes = Array.from(
        { length: 20 },
        (_, i) =>
          toCanonicalEpisode(createTestEpisode({
            mal_id: i + 1,
            kind: 'main',
          })),
      );

      mockJikan.setMockData(malId, { airing: false, episodes });

      const filters = { start: 5, end: 12 };
      const page1 = await repository.invoke(malId, { limit: 3, filters });

      assertEquals(page1.data!.map((e) => e.id), [5, 6, 7]);
      assertEquals(page1.total, 8);

      const page2 = await repository.invoke(malId, {
        limit: 3,
        filters,
        after: page1.last ?? undefined,
      });

      assertEquals(page2.data!.map((e) => e.id), [8, 9, 10]);

      // Go backward
      const backward = await repository.invoke(malId, {
        limit: 3,
        filters,
        before: page2.first ?? undefined,
      });

      assertEquals(backward.data!.map((e) => e.id), [5, 6, 7]);
    });
  });

  describe('cursor invalidation across filter changes', () => {
    it('should invalidate cursor when filters change', async () => {
      const malId = 8008;
      const episodes = Array.from(
        { length: 10 },
        (_, i) =>
          toCanonicalEpisode(createTestEpisode({
            mal_id: i + 1,
            kind: i % 2 === 0 ? 'main' : 'ova',
          })),
      );

      mockJikan.setMockData(malId, { airing: false, episodes });

      // Get cursor using kind=main
      const mainPage = await repository.invoke(malId, {
        limit: 2,
        filters: { kind: 'main' },
      });

      // Try to use that cursor with different filters (kind=ova)
      const ovaPage = await repository.invoke(malId, {
        limit: 2,
        filters: { kind: 'ova' },
        after: mainPage.last ?? undefined,
      });

      // Should start from beginning of ova filtered set
      const ids = ovaPage.data!.map((e) => e.id);
      assertEquals(ids, [2, 4]); // OVA episodes start at id=2 (alternating pattern)
    });
  });

  describe('TTL caching behavior', () => {
    it('should cache fetched episodes', async () => {
      const malId = 9009;
      // Create episodes with old aired dates (30 days ago) to indicate completed series
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
      const episodes = Array.from(
        { length: 3 },
        (_, i) =>
          toCanonicalEpisode(createTestEpisode({
            mal_id: i + 1,
            aired: thirtyDaysAgo + i * 86400, // Stagger by 1 day each
          })),
      );

      mockJikan.setMockData(malId, { airing: false, episodes });

      // First call: cache miss, should fetch
      const firstResult = await repository.invoke(malId, { limit: 10 });
      assertEquals(firstResult.total, 3);

      // Verify document was cached
      const cached = await collection.findOne({ seriesKey: String(malId) });
      assertExists(cached);
      assertEquals(cached.episodes.length, 3);
      assertEquals(cached.airing, false);
    });
  });
});
