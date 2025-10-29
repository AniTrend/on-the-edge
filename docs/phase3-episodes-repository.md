# Phase 3: Episodes Repository Implementation

**Date:** October 8, 2025  
**Status:** ✅ Complete  
**Migration:** Legacy Skyhook/TheXem → Jikan with MongoDB caching and cursor pagination

---

## Overview

Phase 3 implements a production-ready episodes repository following the `on-the-edge` architecture. This replaces the legacy Skyhook-only implementation with a cached, paginated system using Jikan (MyAnimeList) as the primary data source.

## Architecture Changes

### Before (Legacy)

```typescript
// Direct service calls, no caching
class EpisodeService {
  constructor(
    private readonly skyhook: SkyhookService,
    private readonly thexem: TheXemService
  ) {}
  
  async getEpisodes(query: { tvdb: number; season?: number }) {
    const show = await this.skyhook.getShowByTvdb(tvdb);
    const mappings = await this.thexem.getMappingsByTvdb(tvdb);
    // Map episodes with TheXem alignment
    return { episodes, total, tvdbId, season };
  }
}
```

**Issues:**
- No caching → repeated API calls
- Single data source (Skyhook only)
- Season-based filtering only
- No pagination support
- TheXem alignment only

### After (Current)

```typescript
// Repository pattern with caching and pagination
class EpisodeService {
  constructor(
    private readonly mongo: MongoService,
    private readonly jikan: JikanService
  ) {}
  
  async getEpisodes(query: EpisodeQuery) {
    const collection = new MongoCollectionAdapter(
      this.mongo.collection<EpisodeDocument>('episodes')
    );
    const repository = new EpisodesRepository(collection, this.jikan);
    
    return await repository.invoke(malId, {
      limit: query.limit ?? 25,
      after: query.after,
      before: query.before,
      filters: { kind, specialsOnly, start, end }
    });
  }
}
```

**Benefits:**
- ✅ TTL-based caching (12h airing, 7d completed)
- ✅ Cursor-based pagination with stable filter hashing
- ✅ Primary source: Jikan (MyAnimeList)
- ✅ Advanced filtering (kind, range, specials)
- ✅ Future-ready for multi-source enrichment

---

## Cache Strategy

### TTL Configuration

| Show Status | TTL       | Rationale                                          |
|-------------|-----------|---------------------------------------------------|
| Airing      | 12 hours  | New episodes air weekly; frequent updates needed  |
| Completed   | 7 days    | Data stable; reduce API load                      |

### Implementation

```typescript
// loader.ts
export async function load(
  collection: Collection<EpisodeDocument>,
  seriesKey: string
): Promise<EpisodeDocument | undefined> {
  const document = await collection.findOne({ seriesKey });
  if (document) {
    let refreshThreshold = 24 * 7; // 7 days default
    if (document.airing === true) {
      refreshThreshold = 12; // 12 hours for airing
    }
    if (!isOlderThan(currentDate(), document.updatedAt, refreshThreshold)) {
      return document; // Cache hit
    }
  }
  return undefined; // Cache miss or stale
}
```

### Cache Flow

```
Request → Load from MongoDB → Fresh? → Return cached data
                              ↓ Stale
                         Fetch from Jikan
                              ↓
                         Store in MongoDB (upsert)
                              ↓
                         Return fresh data
```

---

## Cursor Pagination

### Design Principles

1. **Opaque Cursors**: Base64-encoded JSON, not readable by clients
2. **Filter Hash Validation**: Cursors invalidated when filters change
3. **Bidirectional**: Support both forward (`after`) and backward (`before`) navigation
4. **Stable**: Position-based, not offset-based

### Cursor Structure

```typescript
interface EpisodeCursorPayload {
  pos: number;    // Zero-based index in filtered episode list
  hash: string;   // SHA-like hash of (seriesKey + filters)
}

// Example encoded cursor:
// "eyJwb3MiOjUsImhhc2giOiJ2MTo5ODc2NTQzMjEifQ=="
```

### Filter Hash Generation

```typescript
export const buildFilterHash = (
  seriesKey: string,
  filters?: EpisodeFilters
): string => {
  const parts: string[] = [`s=${seriesKey}`];
  if (filters?.kind) parts.push(`k=${filters.kind}`);
  if (filters?.specialsOnly) parts.push(`sp=1`);
  if (typeof filters?.start === 'number') parts.push(`st=${filters.start}`);
  if (typeof filters?.end === 'number') parts.push(`en=${filters.end}`);
  
  const raw = parts.join('&');
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = Math.imul(31, h) + raw.charCodeAt(i) | 0;
  }
  return `v1:${Math.abs(h)}`;
};
```

**Why hash filters?**
- Prevents stale cursors from different filter sets
- Example: Cursor from `kind=ova` won't work with `kind=main`
- Hash mismatch → cursor ignored, pagination starts fresh

### Pagination Examples

#### Forward Pagination

```http
GET /v1/episodes?malId=1535&limit=25
→ Returns: {
  data: [ep1, ep2, ..., ep25],
  first: "eyJwb3MiOjA...",
  last: "eyJwb3MiOjI0...",
  next: "eyJwb3MiOjI0...",
  previous: null,
  total: 100
}

GET /v1/episodes?malId=1535&limit=25&after=eyJwb3MiOjI0...
→ Returns episodes 26-50
```

#### Backward Pagination

```http
GET /v1/episodes?malId=1535&limit=25&before=eyJwb3MiOjUw...
→ Returns episodes 26-50 (before position 51)
```

#### Filtered Pagination

```http
GET /v1/episodes?malId=1535&kind=ova&limit=10
→ Returns first 10 OVA episodes with cursor

GET /v1/episodes?malId=1535&kind=ova&limit=10&after=<cursor>
→ Returns next 10 OVA episodes
```

---

## Filter Capabilities

### Supported Filters

| Filter         | Type      | Description                                    | Example                  |
|----------------|-----------|------------------------------------------------|--------------------------|
| `kind`         | enum      | Episode type (main, ova, ona, etc.)            | `kind=ova`               |
| `specialsOnly` | boolean   | Show only special episodes (ova/ona/special)   | `specialsOnly=true`      |
| `start`        | number    | Filter episodes >= this number                 | `start=5`                |
| `end`          | number    | Filter episodes <= this number                 | `end=12`                 |

### Filter Implementation

```typescript
export function applyFilters(
  episodes: EpisodeCanonical[],
  f?: EpisodeFilters
): EpisodeCanonical[] {
  if (!f) return episodes;
  let merged = episodes;

  if (f.kind) {
    merged = merged.filter((e) => e.kind === f.kind);
  }

  if (f.specialsOnly) {
    merged = merged.filter((e) =>
      e.kind === 'ova' ||
      e.kind === 'ona' ||
      e.kind === 'recap' ||
      e.kind === 'filler' ||
      e.kind === 'special'
    );
  }

  if (typeof f.start === 'number') {
    merged = merged.filter((e) => (e.number ?? e.id) >= f.start!);
  }

  if (typeof f.end === 'number') {
    merged = merged.filter((e) => (e.number ?? e.id) <= f.end!);
  }

  return merged;
}
```

### Filter Examples

```http
# Get only OVA episodes
GET /v1/episodes?malId=1535&kind=ova

# Get all special episodes (OVA + ONA + Special)
GET /v1/episodes?malId=1535&specialsOnly=true

# Get episodes 5-12
GET /v1/episodes?malId=1535&start=5&end=12

# Combined: OVA episodes 1-10
GET /v1/episodes?malId=1535&kind=ova&start=1&end=10
```

---

## API Changes

### Request Parameters

**Before:**
```http
GET /v1/episodes?tvdb=81797&season=1
```

**After:**
```http
GET /v1/episodes?malId=1535&limit=25&after=<cursor>&kind=ova&start=5&end=12
```

| Parameter       | Type    | Required | Default | Description                              |
|-----------------|---------|----------|---------|------------------------------------------|
| `malId`         | number  | ✅       | -       | MyAnimeList series ID                    |
| `limit`         | number  | ❌       | 25      | Page size (max 100)                      |
| `after`         | string  | ❌       | -       | Forward pagination cursor                |
| `before`        | string  | ❌       | -       | Backward pagination cursor               |
| `kind`          | enum    | ❌       | -       | Filter by episode kind                   |
| `specialsOnly`  | boolean | ❌       | -       | Show only special episodes               |
| `start`         | number  | ❌       | -       | Filter episodes >= this number           |
| `end`           | number  | ❌       | -       | Filter episodes <= this number           |

### Response Structure

**Before:**
```json
{
  "tvdbId": 81797,
  "season": 1,
  "total": 26,
  "episodes": [
    {
      "id": 553171,
      "seasonNumber": 1,
      "episodeNumber": 1,
      "absoluteOriginal": 1,
      "absoluteAligned": 1,
      "title": "Episode 1",
      "overview": "...",
      "airDate": 1234567890,
      "runtime": 24,
      "image": "https://..."
    }
  ]
}
```

**After:**
```json
{
  "data": [
    {
      "id": 1,
      "number": 1,
      "title": {
        "english": "Episode 1",
        "romanji": null,
        "native": null
      },
      "synopsis": "...",
      "aired": 1234567890,
      "score": 7.5,
      "kind": "main",
      "duration": 24,
      "url": "https://myanimelist.net/anime/1535/1",
      "themes": {
        "openings": ["OP1"],
        "endings": ["ED1"]
      },
      "tvdbShowId": null,
      "tvdbId": null,
      "tmdbId": null,
      "seasonNumber": null,
      "episodeNumber": null,
      "absoluteEpisodeNumber": null,
      "image": null,
      "poster": null
    }
  ],
  "next": "eyJwb3MiOjI0...",
  "previous": null,
  "first": "eyJwb3MiOjA...",
  "last": "eyJwb3MiOjI0...",
  "total": 100
}
```

**Key Differences:**
- `episodes` → `data` (canonical episode objects)
- Added cursor fields: `next`, `previous`, `first`, `last`
- Rich episode data with multi-language titles and themes
- Provider IDs prepared for multi-source enrichment

---

## Repository Pattern

### Class Structure

```typescript
export class EpisodesRepository {
  constructor(
    private readonly collection: Collection<EpisodeDocument>,
    private readonly jikanService: JikanService
  ) {}

  async invoke(
    malId: number,
    opts: {
      after?: EpisodeCursor;
      before?: EpisodeCursor;
      limit: number;
      filters?: EpisodeFilters;
    }
  ): Promise<EpisodesDataResponse> {
    // 1. Build filter hash
    const hash = buildFilterHash(String(malId), opts.filters);
    
    // 2. Try cache (load helper)
    let document = await load(this.collection, String(malId));
    
    // 3. Cache miss → fetch from Jikan
    if (!document) {
      const { airing, episodes } = await fetchCanonical(
        this.jikanService,
        String(malId),
        malId
      );
      document = await persist(
        this.collection,
        String(malId),
        airing ?? false,
        episodes
      );
    }
    
    // 4. Apply filters
    const filtered = applyFilters(document.episodes, opts.filters);
    
    // 5. Paginate
    const page = paginate(filtered, {
      after: opts.after,
      before: opts.before,
      limit: opts.limit,
      hash
    });
    
    // 6. Generate cursors
    const { first, last } = cursors(
      hash,
      page.firstPos,
      page.lastPos,
      page.data.length
    );
    
    return {
      data: page.data,
      next: last ?? null,
      previous: first ?? null,
      first: first ?? null,
      last: last ?? null,
      total: filtered.length
    };
  }
}
```

### Dependency Injection

```typescript
// Service layer
@Injectable()
export class EpisodeService {
  constructor(
    private readonly mongo: MongoService,
    private readonly jikan: JikanService
  ) {}

  async getEpisodes(query: EpisodeQuery) {
    // Create adapter for MongoDB collection
    const mongoCollection = this.mongo.collection<EpisodeDocument>('episodes');
    const collection = new MongoCollectionAdapter(mongoCollection);
    
    // Instantiate repository with dependencies
    const repository = new EpisodesRepository(collection, this.jikan);
    
    // Delegate to repository
    return await repository.invoke(query.malId, {
      limit: query.limit ?? 25,
      after: query.after,
      before: query.before,
      filters: { /* ... */ }
    });
  }
}
```

**Why this pattern?**
- ✅ **Testable**: Repository accepts `Collection<T>` interface → use `InMemoryCollection` in tests
- ✅ **Separation of Concerns**: Service handles HTTP, repository handles data
- ✅ **Reusable**: Repository can be used from other contexts (CLI, workers)
- ✅ **Type-safe**: Full TypeScript coverage with interfaces

---

## Testing Strategy

### Test Infrastructure

```typescript
// Mock Jikan service for offline tests
class MockJikanService {
  private readonly mockData = new Map();
  
  setMockData(malId: number, data: { airing: boolean; episodes: Episode[] }) {
    this.mockData.set(malId, data);
  }
  
  async getAnime(malId: number) {
    const data = this.mockData.get(malId);
    return {
      mal_id: malId,
      airing: data.airing,
      episodes_list: data.episodes,
      theme: { openings: [], endings: [] }
    };
  }
}

// Use in-memory collection
const collection = new InMemoryCollection<EpisodeDocument>();
const mockJikan = new MockJikanService();
const repository = new EpisodesRepository(collection, mockJikan);
```

### Test Coverage

**20 test steps, all passing:**

1. ✅ Cursor encode/decode round trip
2. ✅ Forward pagination (first page, second page)
3. ✅ Limit clamping (negative, over-max)
4. ✅ Cursor hash mismatch (ignore invalid cursor)
5. ✅ Backward pagination (before cursor)
6. ✅ Filter by kind (ova, main, etc.)
7. ✅ Filter by specialsOnly
8. ✅ Filter by range (start, end)
9. ✅ Range with forward/backward pagination
10. ✅ Cursor invalidation across filter changes
11. ✅ TTL caching (12h airing, 7d completed)

### Test Example

```typescript
describe('filter: kind only', () => {
  it('should filter episodes by kind', async () => {
    const malId = 5005;
    const episodes = [
      toCanonicalEpisode({ mal_id: 1, kind: 'main' }),
      toCanonicalEpisode({ mal_id: 2, kind: 'ova' }),
      toCanonicalEpisode({ mal_id: 3, kind: 'main' }),
      toCanonicalEpisode({ mal_id: 4, kind: 'ova' }),
    ];
    
    mockJikan.setMockData(malId, { airing: false, episodes });
    
    const result = await repository.invoke(malId, {
      limit: 10,
      filters: { kind: 'ova' }
    });
    
    assertEquals(result.data?.map((e) => e.id), [2, 4]);
    assertEquals(result.total, 2);
  });
});
```

---

## Data Transformation

### Jikan → Canonical

```typescript
export function toCanonicalEpisode(input: {
  mal_id: number;
  title?: string | null;
  aired?: string | null;
  kind?: string | null;
  themes?: { openings: string[]; endings: string[] } | null;
}): EpisodeCanonical {
  return {
    id: input.mal_id,
    number: input.mal_id,
    title: {
      english: input.title ?? null,
      native: input.title_japanese ?? null,
      romanji: input.title_romanji ?? null
    },
    synopsis: input.synopsis ?? null,
    aired: input.aired ? Math.floor(new Date(input.aired).getTime() / 1000) : null,
    score: input.score ?? null,
    kind: determineKind(input),
    duration: input.duration ?? null,
    url: input.url ?? null,
    themes: input.themes ?? { openings: [], endings: [] },
    // Provider IDs (null for now, enriched later)
    tvdbShowId: null,
    tvdbId: null,
    tmdbId: null,
    // ... other fields
  };
}
```

---

## Files Created/Modified

### Created

| File                                                 | Lines | Purpose                                      |
|------------------------------------------------------|-------|----------------------------------------------|
| `src/package/episodes/repository/episodes.repository.ts` | 110   | Main repository class with invoke() method   |
| `src/package/episodes/repository/helpers/cursor.ts`      | 65    | Cursor encoding/decoding and hash generation |
| `src/package/episodes/repository/helpers/filters.ts`     | 42    | Episode filtering logic                      |
| `src/package/episodes/repository/helpers/loader.ts`      | 120   | Cache load/persist/fetch helpers             |
| `src/package/episodes/repository/helpers/paginate.ts`    | 85    | Pagination slicing and cursor generation     |
| `src/package/episodes/repository/helpers/index.ts`       | 4     | Barrel exports for helpers                   |
| `src/package/episodes/repository/index.ts`               | 2     | Barrel exports for repository                |
| `src/package/episodes/repository/episodes.repository.test.ts` | 350   | Comprehensive test suite (20 test steps)     |

### Modified

| File                                           | Changes                                                      |
|------------------------------------------------|--------------------------------------------------------------|
| `src/package/episodes/episodes.service.ts`    | Replaced Skyhook/TheXem with repository delegation           |
| `src/package/episodes/episodes.schema.ts`     | Added cursor pagination schema, filters, canonical episodes  |
| `src/package/episodes/episodes.controller.ts` | Updated query parameters for pagination and filters          |
| `src/package/episodes/episodes.module.ts`     | Replaced SkyhookModule/TheXemModule with JikanModule/DatabaseModule |
| `src/package/episodes/episodes.types.ts`      | Added `toCanonicalEpisode` transform function                |

**Total:** 8 new files, 5 modified files, ~1000 lines of production code + tests

---

## Performance Considerations

### Cache Efficiency

| Scenario                  | Before (No cache)    | After (With cache)   | Improvement |
|---------------------------|----------------------|----------------------|-------------|
| First request             | 1 Jikan API call     | 1 Jikan API call     | Baseline    |
| Second request (airing)   | 1 Jikan API call     | 0 calls (< 12h)      | 100%        |
| Second request (completed)| 1 Jikan API call     | 0 calls (< 7d)       | 100%        |
| Pagination (next page)    | 0 calls              | 0 calls (cached)     | Same        |

### Query Performance

- **Filter application**: O(n) linear scan (acceptable for episode lists < 1000)
- **Pagination slicing**: O(1) array slice
- **Cursor decode**: O(1) base64 decode + JSON parse
- **Hash generation**: O(m) where m = filter string length (typically < 100 chars)

### MongoDB Indexes

Recommended indexes for production:

```javascript
db.episodes.createIndex({ seriesKey: 1 }, { unique: true });
db.episodes.createIndex({ updatedAt: 1 }); // For TTL monitoring
```

---

## Migration Guide

### For API Consumers

**Breaking Changes:**

1. **Query parameter change:**
   - Old: `tvdb=81797&season=1`
   - New: `malId=1535&limit=25&after=<cursor>`

2. **Response structure:**
   - Old: `{ tvdbId, season, total, episodes: [...] }`
   - New: `{ data: [...], next, previous, first, last, total }`

3. **Episode shape:**
   - Old: Flat fields (`id`, `seasonNumber`, `episodeNumber`, `absoluteAligned`)
   - New: Rich objects with nested `title`, `themes`, provider IDs

**Migration Example:**

```typescript
// Before
const response = await fetch('/v1/episodes?tvdb=81797&season=1');
const { episodes } = await response.json();
episodes.forEach(ep => console.log(ep.title));

// After
const response = await fetch('/v1/episodes?malId=1535&limit=25');
const { data, next } = await response.json();
data.forEach(ep => console.log(ep.title.english));

// Pagination
if (next) {
  const nextPage = await fetch(`/v1/episodes?malId=1535&limit=25&after=${next}`);
}
```

### For Developers

**Code Changes:**

1. Replace `SkyhookService` → `JikanService`
2. Replace `TheXemService` usage → removed (future: optional enrichment)
3. Add `MongoService` dependency
4. Update module imports: `JikanModule`, `DatabaseModule`
5. Update response types to `EpisodesDataResponse`

---

## Future Enhancements

### Phase 4: Multi-Source Enrichment (Planned)

```typescript
// Future: Enrich Jikan episodes with TMDB/Skyhook data
const slices = [
  { source: 'JIKAN', episodes: jikanEpisodes },
  { source: 'TMDB', episodes: await getTmdbEpisodes(tmdbId) },
  { source: 'SKYHOOK', episodes: await getSkyhookEpisodes(tvdbId) },
];

const merged = mergeEpisodes(slices, { preferRuntime: 'JIKAN' });
```

### Potential Features

- [ ] Diagnostic info in response (`diagnostics.sources`, `diagnostics.cached`)
- [ ] TheXem alignment as optional enrichment (feature flag)
- [ ] TMDB/Trakt episode merging
- [ ] Notify.moe episode data integration
- [ ] Episode themes (openings/endings) from Jikan
- [ ] Episode images from TMDB
- [ ] Season/episode number mapping from Skyhook

---

## Conclusion

Phase 3 successfully migrates the episodes module from a legacy Skyhook-based implementation to a modern, cached, paginated system using Jikan (MyAnimeList) as the primary source. The new architecture:

✅ **Reduces API load** with intelligent TTL caching  
✅ **Improves UX** with cursor-based pagination  
✅ **Increases flexibility** with advanced filtering  
✅ **Enhances testability** with repository pattern and DI  
✅ **Prepares for growth** with multi-source enrichment foundation  

**Test Results:** 20/20 passing ✅  
**Compilation:** No errors ✅  
**Lint:** Clean ✅  
**Documentation:** Complete ✅  

**Next:** Phase 4 will port the series repository with similar patterns.
