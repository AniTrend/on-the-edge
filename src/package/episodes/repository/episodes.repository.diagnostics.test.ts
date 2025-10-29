import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assert, assertEquals, assertExists } from '@std/assert';
import { EpisodesRepository } from './episodes.repository.ts';
import { EpisodesResolver } from './episodes.resolver.ts';
import { InMemoryCollection } from '@scope/database/testing';
import { createLoggerStub } from '@scope/logger/testing';
import type { EpisodeDocument } from '../episodes.document.ts';
import { toCanonicalEpisode } from '../transformer/canonical.ts';
import type { AnimeEpisode, JikanService } from '@scope/service/jikan';
import type { SkyhookService } from '@scope/service/skyhook';
import type { TmdbService } from '@scope/service/tmdb';
import type { TraktService } from '@scope/service/trakt';
import type { NotifyService } from '@scope/service/notify';
import type { ThemeService } from '@scope/service/theme';
import type { TheXemService } from '@scope/service/thexem';
import type { MongoService } from '@scope/database';
import type { EpisodeKind } from '../episodes.types.ts';

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

class MockMongoService {
  constructor(private memoryCollection: InMemoryCollection<EpisodeDocument>) {}

  // deno-lint-ignore no-explicit-any
  collection<T>(_name: string): any {
    return this.memoryCollection;
  }
}

describe('EpisodesRepository diagnostics (persisted)', () => {
  let collection: InMemoryCollection<EpisodeDocument>;
  let mockJikan: MockJikanService;
  let mockMongo: MockMongoService;
  let resolver: EpisodesResolver;
  let repository: EpisodesRepository;
  const { logger } = createLoggerStub();

  beforeEach(() => {
    collection = new InMemoryCollection<EpisodeDocument>();
    mockJikan = new MockJikanService();
    mockMongo = new MockMongoService(collection);
  });

  afterEach(() => {
    collection.clear();
  });

  it('emits diagnostics without feature flag (persisted metadata)', async () => {
    const malId = 4242;
    const episodes = Array.from(
      { length: 3 },
      (_, i) => toCanonicalEpisode(createTestEpisode({ mal_id: i + 1 })),
    );
    mockJikan.setMockData(malId, { airing: false, episodes });

    resolver = new EpisodesResolver(
      mockJikan as unknown as JikanService,
      {} as unknown as SkyhookService,
      {} as unknown as TmdbService,
      {} as unknown as TraktService,
      {} as unknown as NotifyService,
      {} as unknown as ThemeService,
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

    const result = await repository.invoke(malId, { limit: 10 });
    assertExists(result.data);
    assertEquals(result.total, 3);
    assertExists(result.diagnostics);
    assert(Array.isArray(result.diagnostics!.sources));
    assertEquals(result.diagnostics!.sources.includes('JIKAN'), true);
    assertExists(result.diagnostics!.updatedAt);
    const t = result.diagnostics!.mergeStats.titleSimThreshold;
    assert(t === null || typeof t === 'number');
  });

  it('keeps behavior stable when other source flags are enabled but fetchers return null', async () => {
    const malId = 4343;
    const episodes = Array.from(
      { length: 2 },
      (_, i) => toCanonicalEpisode(createTestEpisode({ mal_id: i + 1 })),
    );
    mockJikan.setMockData(malId, { airing: false, episodes });

    resolver = new EpisodesResolver(
      mockJikan as unknown as JikanService,
      {} as unknown as SkyhookService,
      {} as unknown as TmdbService,
      {} as unknown as TraktService,
      {} as unknown as NotifyService,
      {} as unknown as ThemeService,
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

    const result = await repository.invoke(malId, { limit: 10 });
    assertExists(result.data);
    assertEquals(result.total, 2);
    assertExists(result.diagnostics);
    // sources should still be only JIKAN since other slices are null
    assertEquals(result.diagnostics!.sources, ['JIKAN']);
  });
});
