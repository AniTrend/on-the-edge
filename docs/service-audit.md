# Service Audit for Episodes/Series Migration

**Date**: October 7, 2025\
**Status**: Complete

## Overview

This document audits existing service integrations in the Danet repository and identifies what needs to be ported from the on-the-edge (Deno/Oak) repository for the episodes and series migration.

## Current State: Danet Repository Services

### Available Services (src/service/*)

| Service              | Purpose              | Key Methods                                                 | Schema Validation | Test Coverage |
| -------------------- | -------------------- | ----------------------------------------------------------- | ----------------- | ------------- |
| **JikanService**     | MyAnimeList API      | `getAnime(malId)`, `getManga(malId)`                        | ✅ Zod            | ✅ Complete   |
| **SkyhookService**   | TVDB metadata        | `getShowByTvdb(tvdbId)`                                     | ✅ Zod            | ✅ Complete   |
| **ArmService**       | ID mapping/relations | `getAniListRelationId(anilist)`, `getRelationsByTvdb(tvdb)` | ✅ Zod            | ✅ Complete   |
| **TmdbService**      | TMDB metadata        | `getShow(tmdb)`, `getSeason(season, tmdb)`                  | ✅ Zod            | ✅ Complete   |
| **TraktService**     | Trakt.tv metadata    | `getShow(trakt)`                                            | ✅ Zod            | ✅ Complete   |
| **NotifyService**    | notify.moe           | -                                                           | -                 | -             |
| **ThemeService**     | OP/ED themes         | -                                                           | -                 | -             |
| **TheXemService**    | Episode mapping      | -                                                           | -                 | -             |
| **OtakuModeService** | -                    | -                                                           | -                 | -             |

### Service Capabilities

#### JikanService (MyAnimeList API)

**Current Features:**

- ✅ Fetch anime with full details (`/anime/{id}/full`)
- ✅ Fetch anime moreinfo (`/anime/{id}/moreinfo`)
- ✅ Fetch paginated episodes with window filtering
- ✅ Episode enrichment utilities (`enrichEpisodes`)
- ✅ Fallback from `/full` to base endpoint
- ✅ Retry configuration (2 retries, 200ms base delay)

**API Coverage:**

```typescript
getAnime(malId, options?: {
  episodes?: boolean;
  maxEpisodes?: number;
  episodeWindow?: { from?: number; to?: number };
}): Promise<JikanAnime | undefined>
```

**Episode Data Shape:**

```typescript
interface AnimeEpisode {
  mal_id: number;
  url: string;
  title: string;
  title_japanese?: string;
  title_romanji?: string;
  aired?: string;
  score?: number;
  filler?: boolean;
  recap?: boolean;
  duration?: number;
  synopsis?: string;
  kind?: string; // enriched field
}
```

#### SkyhookService (TVDB via Skyhook)

**Current Features:**

- ✅ Fetch show by TVDB ID
- ✅ Complete show metadata with episodes array
- ✅ Retry configuration

**API Coverage:**

```typescript
getShowByTvdb(tvdbId): Promise<SkyhookShow | undefined>
```

**Episode Data Shape:**

```typescript
interface SkyhookEpisode {
  tvdbShowId: number;
  tvdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  absoluteEpisodeNumber?: number;
  title?: string;
  airDate: Date;
  airDateUtc: Date;
  runtime?: number;
  finaleType?: string;
  overview?: string;
  image?: string;
}
```

#### ArmService (Anime Relations Mapper)

**Current Features:**

- ✅ Get relations by AniList ID
- ✅ Get relations by TVDB ID
- ✅ Maps between 11 different service IDs

**API Coverage:**

```typescript
getAniListRelationId(anilist): Promise<SeriesRelationId | undefined>
getRelationsByTvdb(tvdb): Promise<SeriesRelationId[]>
```

**Relation Shape:**

```typescript
interface SeriesRelationId {
  anidb?: number;
  anilist?: number;
  'anime-planet'?: string;
  anisearch?: number;
  imdb: string; // required
  kitsu?: number;
  livechart?: number;
  'notify-moe'?: string;
  themoviedb?: number;
  thetvdb?: number;
  myanimelist?: number;
}
```

#### TmdbService (The Movie Database)

**Current Features:**

- ✅ Fetch show by TMDB ID
- ✅ Fetch season by number
- ✅ Configuration management (image providers)
- ✅ Episodes embedded in season response

**API Coverage:**

```typescript
getShow(tmdb): Promise<TmdbShow | undefined>
getSeason(season, tmdb): Promise<TmdbSeason | undefined>
```

**Episode Data Shape:**

```typescript
interface TmdbEpisode {
  air_date: string;
  episode_number: number;
  episode_type: string;
  id: number;
  name: string;
  overview: string;
  production_code: string;
  runtime: number;
  season_number: number;
  show_id: string;
  still_path: string;
  vote_average: number;
  vote_count: number;
  crew: TmdbCrew[];
  guest_stars: TmdbCrew[];
}
```

#### TraktService (Trakt.tv)

**Current Features:**

- ✅ Fetch show by Trakt ID or slug
- ✅ Extended metadata (`?extended=full`)
- ✅ Custom headers (trakt-api-version, trakt-api-key)

**API Coverage:**

```typescript
getShow(trakt: number | string): Promise<TraktShow | undefined>
```

**Note:** Current implementation doesn't fetch episodes. Need to add `getSeasons()` and `getSeasonEpisodes()` methods.

## Gap Analysis: What's Missing from Danet

### Critical Gaps

1. **Trakt Episodes API** ❌
   - Current: Only show metadata
   - Need: Season and episode endpoints
   - On-the-edge has: `getTraktSeasons(showId)`, `getTraktSeasonEpisodes(showId, season)`

2. **TheXem Service** ❌
   - Purpose: Scene/TVDB/AniDB episode number mapping
   - Critical for anime episode numbering normalization
   - On-the-edge has: Full implementation with caching

3. **Notify.moe Service** ⚠️
   - Service exists but implementation unclear
   - On-the-edge uses for additional episode metadata

4. **Theme Service** ⚠️
   - Service exists but implementation unclear
   - On-the-edge uses for OP/ED themes

### Architecture Differences

| Feature           | On-the-edge (Deno/Oak)          | Danet (Current)                    | Migration Strategy                          |
| ----------------- | ------------------------------- | ---------------------------------- | ------------------------------------------- |
| **DI Framework**  | Manual DI / Factories           | Danet decorators (`@Injectable()`) | Port to Danet DI                            |
| **HTTP Client**   | Global `request()` helper       | `RequestClient` (per-service)      | Keep Danet pattern                          |
| **Persistence**   | MongoDB via `@mongodb` driver   | Not implemented                    | Create `Collection<T>` interface + adapters |
| **Feature Flags** | GrowthBook `Features` interface | Not implemented                    | Port Features interface                     |
| **Logging**       | Global `logger`                 | `LoggerService` injection          | Keep Danet pattern                          |
| **Configuration** | `env()` helper                  | `SecretService`                    | Keep Danet pattern                          |
| **Testing**       | Manual mocks + stub helpers     | Test infrastructure (Phases 1-5)   | Use Danet test infrastructure               |

### Cache Layer (Current State)

- Danet port ships with an in-memory `CacheService`; TTL is enforced on read but the store is non-persistent.
- No eviction policy or memory ceiling exists, so the cache should be treated as a local/test utility until Redis is wired back in.
- The cleanup cron only performs best-effort sweeps; production deployments must use the planned Redis client for durability and back-pressure.

## On-the-Edge: Episodes Module Structure

### Core Components

```
episodes/
├── collection/
│   └── episode.collection.ts          # MongoDB adapter interface
├── repository/
│   ├── episodes.repository.ts         # Main business logic
│   ├── season.repository.ts           # Season-based queries
│   └── helpers/
│       ├── loader.ts                  # Fetch & persist logic
│       ├── sources.ts                 # Multi-source orchestration
│       ├── enrichers.ts               # TMDB image enrichment
│       ├── cursor.ts                  # Pagination utilities
│       ├── filters.ts                 # Episode filtering
│       ├── paginate.ts                # Cursor pagination
│       └── stats.ts                   # Merge statistics
├── aggregator/
│   ├── merge.ts                       # Multi-source episode merge
│   └── types.ts                       # Merge result types
├── helpers/
│   ├── sources.ts                     # Provider-specific helpers
│   └── scope.ts                       # Season scope derivation
├── store/
│   └── types.ts                       # Storage types
├── tests/
│   ├── episodes.test.ts               # Core tests
│   ├── episodes.experiments.test.ts   # Feature flag tests
│   ├── episodes.season-merge.test.ts  # Multi-source tests
│   └── episodes.controller.test.ts    # Controller tests
├── episodes.controller.ts             # Oak route handler
├── episodes.params.ts                 # Query parameter parsing
└── episodes.types.ts                  # Domain types
```

### Key Patterns from On-the-Edge

#### 1. Repository Layer

```typescript
// On-the-edge pattern
export class EpisodesRepository {
  constructor(
    private readonly collection: EpisodeCollection,
    private readonly features: Features,
  ) {}

  async invoke(
    id: number,
    opts: {
      after?: EpisodeCursor;
      before?: EpisodeCursor;
      limit: number;
      filters?: FilterOptions;
      relation?: SeriesRelationId;
    },
  ): Promise<EpisodesDataResponse> {
    // 1. Load or fetch canonical episodes (Jikan)
    // 2. Optionally enrich with other providers (feature flags)
    // 3. Merge multi-source data
    // 4. Apply filters
    // 5. Paginate with cursors
    // 6. Return page + cursor metadata
  }
}
```

#### 2. Collection Interface

```typescript
// On-the-edge pattern
export interface EpisodeCollection {
  lastUpdated(seriesKey: string): Promise<Instant | null>;
  get(seriesKey: string): Promise<EpisodeDocument | null>;
  save(doc: EpisodeDocument): Promise<EpisodeDocument>;
}

// MongoDB implementation
export class EpisodeLocalSource implements EpisodeCollection {
  constructor(
    private readonly collection?: Collection<EpisodeDocument>,
  ) {}
  // ... implementation
}
```

#### 3. Multi-Source Merging

```typescript
// On-the-edge pattern
const slices: SourceSlice[] = [
  { source: 'JIKAN', episodes: jikanEpisodes },
];

// Feature flag gated
if (features.isOn('episodes.sources.skyhook')) {
  const skyhookSlice = await getSkyhookSlice(relation);
  if (skyhookSlice) slices.push(skyhookSlice);
}

const merged = mergeEpisodes(
  { preferRuntime: 'JIKAN', titleSimThreshold: 0.8 },
  slices,
);
```

#### 4. Cursor-Based Pagination

```typescript
// On-the-edge pattern
interface EpisodeCursorPayload {
  seriesKey: string;
  position: number;
  filterHash: string; // Invalidates cursor if filters change
}

const encodeCursor = (payload: EpisodeCursorPayload): string => {
  return btoa(JSON.stringify(payload));
};

const decodeCursor = (cursor: string): EpisodeCursorPayload => {
  return JSON.parse(atob(cursor));
};
```

## On-the-Edge: Series Module Structure

### Core Components

```
series/
├── local/
│   └── series.local.source.ts         # MongoDB adapter
├── repository/
│   ├── series.repository.ts           # Main business logic
│   └── helpers/
│       └── qualifier.ts               # Type guards (isAnime, isMovie)
├── transformer/
│   └── series.transformer.ts          # Multi-source aggregation
├── controller.ts                      # Oak route handler
└── types.ts                           # Domain types
```

### Key Patterns

#### 1. Repository Layer

```typescript
// On-the-edge pattern
export default class SeriesRepository {
  constructor(
    private readonly local: LocalSource,
  ) {}

  async getById(id: MediaParamId): Promise<IResponse<MediaEntity>> {
    // 1. Check cache (with TTL)
    // 2. Fetch from multiple providers in parallel
    //    - Jikan (canonical)
    //    - ARM (relations)
    //    - Skyhook
    //    - TMDB
    //    - Trakt
    //    - Themes
    // 3. Transform/merge
    // 4. Persist with updatedAt
    // 5. Return merged entity
  }
}
```

#### 2. Local Source (Cache Layer)

```typescript
// On-the-edge pattern
export default class LocalSource {
  constructor(
    private readonly collection?: Collection<unknown>,
  ) {}

  async getIds(id: number): Promise<SeriesRelationId | null> {
    const doc = await this.collection?.findOne({ anilist: id });
    return doc?.ids ?? null;
  }

  async save(data: MediaEntity): Promise<void> {
    await this.collection?.updateOne(
      { anilist: data.id },
      { $set: data },
      { upsert: true },
    );
  }

  async lastUpdated(id: number): Promise<number | null> {
    const doc = await this.collection?.findOne({ anilist: id });
    return doc?.updatedAt ?? null;
  }
}
```

## Migration Requirements

### 1. Service Extensions

#### Extend TraktService

```typescript
// Add to src/service/trakt/trakt.service.ts
async getSeasons(trakt: number | string): Promise<TraktSeason[]>
async getSeasonEpisodes(
  trakt: number | string,
  season: number
): Promise<TraktEpisode[]>
```

#### Create TheXemService

```typescript
// New: src/service/thexem/thexem.service.ts
@Injectable()
export class TheXemService {
  async getMappingsByTvdb(tvdbId: number): Promise<TheXem[]>;
}
```

#### Enhance NotifyService & ThemeService

- Review and complete implementation if needed

### 2. Persistence Layer

#### Create Collection Interface

```typescript
// New: src/common/collection/collection.interface.ts
export interface Collection<T> {
  findOne(filter: Record<string, unknown>): Promise<T | null>;
  findOneAndReplace(
    filter: Record<string, unknown>,
    replacement: T,
    options: { upsert: boolean; returnDocument: 'after' | 'before' },
  ): Promise<T | null>;
  updateOne(
    filter: Record<string, unknown>,
    update: { $set: Partial<T> },
    options: { upsert: boolean },
  ): Promise<void>;
}
```

#### Create MongoDB Adapter

```typescript
// New: src/common/collection/mongo.adapter.ts
export class MongoCollection<T> implements Collection<T> {
  constructor(private readonly collection: MongoCollection<T>) {}
  // Implement interface methods
}
```

#### Create In-Memory Adapter

```typescript
// New: src/common/collection/memory.adapter.ts
export class InMemoryCollection<T> implements Collection<T> {
  private memory: Map<string, T> = new Map();
  // Implement interface methods
}
```

### 3. Feature Flags

#### Create Features Interface

```typescript
// New: src/common/features/features.interface.ts
export interface Features {
  isOn(key: string): boolean;
  getFeatureValue<T>(key: string, defaultValue: T): T;
}

// New: src/common/features/features.service.ts
@Injectable()
export class FeaturesService implements Features {
  // Implement using environment variables or GrowthBook
}
```

### 4. Episodes Module Structure (Danet)

```
src/packages/episodes/
├── collection/
│   ├── episode.collection.interface.ts
│   └── episode.collection.adapter.ts
├── repository/
│   ├── episodes.repository.ts
│   ├── episodes.repository.test.ts
│   └── helpers/
│       ├── loader.ts
│       ├── sources.ts
│       ├── cursor.ts
│       ├── filters.ts
│       ├── paginate.ts
│       └── stats.ts
├── aggregator/
│   ├── merge.ts
│   ├── merge.test.ts
│   └── types.ts
├── helpers/
│   ├── sources.ts
│   └── scope.ts
├── transformer/
│   └── episode.transformer.ts
├── spec/
│   ├── episodes.integration.test.ts
│   └── episodes.experiments.test.ts
├── episodes.controller.ts
├── episodes.service.ts
├── episodes.module.ts
├── episodes.schema.ts
└── episodes.types.ts
```

### 5. Series Module Structure (Danet)

```
src/packages/series/
├── collection/
│   ├── series.collection.interface.ts
│   └── series.collection.adapter.ts
├── repository/
│   ├── series.repository.ts
│   ├── series.repository.test.ts
│   └── helpers/
│       └── qualifier.ts
├── transformer/
│   └── series.transformer.ts
├── spec/
│   └── series.integration.test.ts
├── series.controller.ts
├── series.service.ts
├── series.module.ts
├── series.schema.ts
└── series.types.ts
```

## Testing Strategy

### Unit Tests (Per Module)

- ✅ Use `InMemoryCollection` adapter
- ✅ Use `createSecretStub()` for base URLs
- ✅ Use `mockJsonResponse()` for HTTP stubs
- ✅ Use fixture files for realistic responses
- ✅ Use `EpisodeBuilder` for test data

### Integration Tests

- Test full controller → service → repository → collection flow
- Stub all external HTTP calls
- Use feature flags to test optional integrations
- Test pagination edge cases
- Test multi-source merging

### Example Test Pattern

```typescript
import { createSecretStub } from '@scope/testing';
import { mockJsonResponse, resetFetch } from '@scope/testing';
import { InMemoryCollection } from '@scope/collection';
import { loadFixture } from '@scope/testing';

describe('EpisodesRepository', () => {
  let collection: InMemoryCollection<EpisodeDocument>;
  let secrets: SecretService;

  beforeEach(() => {
    collection = new InMemoryCollection();
    secrets = createSecretStub({
      MAL: 'https://mal.test',
      SKYHOOK: 'https://skyhook.test',
    });
  });

  afterEach(() => {
    resetFetch();
  });

  it('should fetch and paginate episodes', async () => {
    const animeData = await loadFixture('jikan/anime-sample.json');
    mockJsonResponse(`https://mal.test/anime/123/full`, animeData);

    const repo = new EpisodesRepository(collection, features);
    const result = await repo.invoke(123, { limit: 10 });

    assertEquals(result.data.length, 10);
    assert(result.first);
    assert(result.last);
  });
});
```

## Next Steps

1. ✅ **Service Audit Complete**
2. ⏳ **Design MongoDB Interfaces** - Create `Collection<T>` interface
3. ⏳ **Type System Alignment** - Map on-the-edge types to Danet schemas
4. ⏳ **Port Episodes Module** - Start with controller/service/repository
5. ⏳ **Port Series Module** - Leverage patterns from episodes

## References

- On-the-edge episodes: `https://github.com/AniTrend/on-the-edge/tree/main/src/episodes`
- On-the-edge series: `https://github.com/AniTrend/on-the-edge/tree/main/src/series`
- Danet services: `/src/service/*`
- Test infrastructure: `/docs/test-infrastructure-summary.md`
- Migration plan: `/docs/episodes-series-migration-plan.md`
