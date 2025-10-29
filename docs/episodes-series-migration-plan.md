# Episodes & Series Migration Plan

## Executive Summary
This document outlines the strategy for migrating the `episodes` and `series` modules from the [AniTrend/on-the-edge](https://github.com/AniTrend/on-the-edge) repository into the sample-danet repository. The migration involves adapting Oak-based controllers to Danet's DI system, aligning with established patterns from the `config` and `news` modules, and leveraging services from `@scope/service/*`.

## Migration Objectives

### 1. **Preserve Existing Functionality**
The current `episodes` and `series` modules in sample-danet provide simplified aggregation endpoints:
- **Episodes**: Fetches episodes from Skyhook with TheXEM alignment
- **Series**: Aggregates identifiers across multiple services (Trakt, TMDB, Skyhook, Notify, Jikan, ARM)

The on-the-edge implementations offer advanced features:
- **Episodes**: Multi-source merging (Jikan, Skyhook, TMDB, Trakt, Notify, Themes), cursor-based pagination, filtering, and MongoDB persistence
- **Series**: Full media metadata aggregation with persistence

### 2. **Target Architecture**
The migration should result in:
- Clean separation: Controller → Service → Repository → Transformer
- Danet dependency injection throughout
- MongoDB persistence with cache layer
- Zod schema validation for inputs/outputs
- Swagger/OpenAPI integration
- Comprehensive test coverage using in-memory adapters

### 3. **Service Layer Integration**
Both modules must leverage existing services from `@scope/service/*`:
- `ArmService` - Series relationship resolution
- `JikanService` - MyAnimeList data
- `NotifyService` - notify.moe anime data
- `SkyhookService` - TheTVDB series & episode data
- `ThemeService` - Opening/ending themes
- `TheXemService` - Episode number alignment
- `TmdbService` - TMDB metadata
- `TraktService` - Trakt.tv data

---

## Current State Analysis

### Episodes Module

#### sample-danet (Current)
**Files**: `episodes.controller.ts`, `episodes.service.ts`, `episodes.module.ts`, `episodes.schema.ts`, `episodes.types.ts`, `index.ts`

**Capabilities**:
- Simple GET endpoint: `/v1/episodes?tvdb={id}&season={num}`
- Fetches from Skyhook service only
- Aligns episode numbers using TheXEM mappings
- No persistence or caching
- Returns flat list of episodes with TVDB metadata

**Dependencies**:
- `SkyhookService`
- `TheXemService`
- `ExperimentService`
- `LoggerService`

#### on-the-edge (Source)
**Files**: `episodes.controller.ts`, `episodes.types.ts`, `episodes.params.ts`, `episodes.test.ts`, `repository/episodes.repository.ts`, `collection/episode.collection.ts`, `store/types.ts`, `aggregator/*`, `helpers/*`

**Capabilities**:
- Complex GET endpoint: `/episodes?id={malId}&after={cursor}&before={cursor}&limit={num}&filters={...}&relation={...}`
- Multi-source episode aggregation (Jikan as canonical + Skyhook/TMDB/Trakt/Notify/Themes enrichment)
- Cursor-based pagination with filter hash validation
- MongoDB persistence with update tracking
- Filtering by episode kind, specials, ranges
- Season/episode scope derivation and alignment
- Diagnostic information in responses
- TheXEM normalization support

**Key Components**:
- `EpisodesRepository` - Orchestrates fetching, merging, filtering, and pagination
- `EpisodeLocalSource` - MongoDB collection wrapper
- `MergeResult` - Aggregated episode data structure
- Helper functions for pagination, filtering, sources, enrichment

**Dependencies**:
- MongoDB collection interface
- Feature flags for optional integrations
- External services via service layer
- Caching mechanism for stale data detection

### Series Module

#### sample-danet (Current)
**Files**: `series.controller.ts`, `series.service.ts`, `series.module.ts`, `series.schema.ts`, `series.types.ts`, `index.ts`

**Capabilities**:
- GET endpoint: `/v1/series?trakt={id}&slug={slug}&tvdb={id}&tmdb={id}&notify={id}&anilist={id}&mal={id}`
- Iterative identifier resolution across services
- Returns aggregated IDs and raw service responses
- No persistence
- Up to 6 resolution iterations

**Dependencies**:
- All major service providers (Trakt, TMDB, Skyhook, Notify, Jikan, ARM, TheXEM)
- `LoggerService`

#### on-the-edge (Source)
**Files**: `controller.ts`, `types.ts`, `repository/series.repository.ts`, `local/series.local.source.ts`, `local/types.ts`, `local/series.local.transformer.ts`, `transformer/series.transformer.ts`

**Capabilities**:
- GET endpoint: `/series?id={anilistId}`
- Fetches and transforms complete media metadata
- MongoDB persistence with update staleness detection (4-day threshold)
- Rich domain types (SeriesTitle, SeriesCoverImage, SeriesSchedule, SeriesNetwork, etc.)
- Support for both anime and manga types
- Comprehensive metadata aggregation and transformation

**Key Components**:
- `SeriesRepository` - Orchestrates remote fetching and local persistence
- `LocalSource` - MongoDB collection management with staleness checks
- `seriesTransform` - Converts remote payloads to domain model
- Domain types for comprehensive series metadata

**Dependencies**:
- MongoDB collection interface
- All service providers
- Transformation utilities for media metadata

---

## Migration Strategy

### Phase 1: Foundation & Analysis (Pre-migration)

#### 1.1 Service Layer Audit
**Goal**: Ensure all required services are available and follow the Danet pattern

**Tasks**:
- ✅ Verify all services exist in `@scope/service/*` with proper exports
- ✅ Confirm service implementations match expected interfaces from on-the-edge
- ⚠️  Identify missing service methods or capabilities
- ⚠️  Document any breaking changes between Oak-style and Danet-style service usage

**Known Gaps**:
- On-the-edge uses direct function calls (e.g., `getJikanAnime()`, `getSkyhookShow()`)
- Sample-danet services use instance methods (e.g., `this.jikan.getAnime()`)
- Need to verify all remote functions have corresponding service methods

#### 1.2 MongoDB Collection Interface
**Goal**: Define collection interface compatible with both implementations

**Tasks**:
- Review `EpisodeCollection` and `LocalSource` interfaces from on-the-edge
- Compare with sample-danet's existing MongoDB patterns (see `news.repository.ts`)
- Design unified collection interface that supports:
  - `findOne`, `insertMany`, `updateOne` (for episodes)
  - `findOneAndReplace` with upsert (for series)
  - Sorting and projection helpers
- Create in-memory collection adapter for tests

#### 1.3 Type System Alignment
**Goal**: Map on-the-edge types to sample-danet conventions

**Tasks**:
- Map `EpisodeCanonical` → domain type for sample-danet
- Map `MediaEntity`/`MediaUnion` → domain type for sample-danet
- Identify shared types that can be reused from `@scope/common/types`
- Document type transformations needed

### Phase 2: Episodes Module Migration

#### 2.1 Core Types & Schemas
**File Structure**: Following the established pattern from the `news` module, the type system is organized into four distinct files, each serving a specific purpose:

1. **`episodes.types.ts`** - TypeScript type definitions
   - Core domain types and interfaces
   - Business logic representations
   - Used throughout the application for type safety

2. **`episodes.schema.ts`** - Zod schema definitions
   - Runtime validation schemas
   - Input/output validation
   - Query parameter validation
   - Foundation for both Swagger and Types

3. **`episodes.swagger.ts`** - OpenAPI/Swagger documentation
   - Extends Zod schemas with OpenAPI metadata
   - API documentation annotations
   - Used by Danet's Swagger integration

4. **`episodes.document.ts`** - MongoDB document types
   - Database persistence schemas
   - Combines domain types with MongoDB metadata (`_id`, etc.)
   - Repository layer types

**Pattern Example** (from `news` module):
- `news.types.ts` → `News`, `NewsPaging` (pure TypeScript types)
- `news.schema.ts` → `NewsSchema`, `NewsPagingSchema` (Zod validation)
- `news.swagger.ts` → `NewsSwagger`, `NewsPagingSwagger` (OpenAPI docs)
- `news.document.ts` → `NewsDocument` (MongoDB persistence)

**File**: `src/package/episodes/episodes.types.ts`

**Implementation**:
```typescript
// filepath: /Users/maxwellmapako/Documents/Git/sample-danet/src/package/episodes/episodes.types.ts
import { z } from 'zod';
import {
  EpisodeCanonicalSchema,
  EpisodeCursorPayloadSchema,
  EpisodesPageSchema,
  EpisodesQuerySchema,
} from './episodes.schema.ts';

// Core episode types inferred from Zod schemas
export type EpisodeKind = 
  | 'main' | 'ova' | 'ona' | 'recap' | 'filler' 
  | 'special' | 'music' | 'other';

export type EpisodeCanonical = z.infer<typeof EpisodeCanonicalSchema>;
export type EpisodeTitle = EpisodeCanonical['title'];
export type EpisodeCursorPayload = z.infer<typeof EpisodeCursorPayloadSchema>;
export type EpisodeCursor = string; // base64 encoded JSON
export type EpisodesQuery = z.infer<typeof EpisodesQuerySchema>;
export type EpisodesPage = z.infer<typeof EpisodesPageSchema>;
```

**File**: `src/package/episodes/episodes.schema.ts`

**Implementation**:
```typescript
// filepath: /Users/maxwellmapako/Documents/Git/sample-danet/src/package/episodes/episodes.schema.ts
import { z } from 'zod';
import { createPagingSchema } from '@scope/common/utils';

// Episode kind enumeration
export const EpisodeKindSchema = z.enum([
  'main', 'ova', 'ona', 'recap', 'filler', 
  'special', 'music', 'other',
]);

// Episode title structure
export const EpisodeTitleSchema = z.object({
  english: z.string().nullish(),
  native: z.string().nullish(),
  romanji: z.string().nullish(),
});

// Episode themes structure
export const EpisodeThemesSchema = z.object({
  openings: z.array(z.string()),
  endings: z.array(z.string()),
});

// Core canonical episode schema
export const EpisodeCanonicalSchema = z.object({
  id: z.number().int().positive(),
  number: z.number().int().positive(),
  title: EpisodeTitleSchema,
  synopsis: z.string().nullish(),
  aired: z.number().int().nullish().openapi({ description: 'Unix epoch timestamp' }),
  score: z.number().min(0).max(10).nullish(),
  kind: EpisodeKindSchema,
  duration: z.number().int().nullish().openapi({ description: 'Duration in seconds' }),
  url: z.string().url().nullish(),
  themes: EpisodeThemesSchema,
  // Season/episode metadata
  tvdbShowId: z.number().int().nullish(),
  tvdbId: z.number().int().nullish(),
  tmdbId: z.number().int().nullish(),
  seasonNumber: z.number().int().nullish(),
  episodeNumber: z.number().int().nullish(),
  absoluteEpisodeNumber: z.number().int().nullish(),
  // Skyhook ordering metadata
  airedBeforeSeasonNumber: z.number().int().nullish(),
  airedBeforeEpisodeNumber: z.number().int().nullish(),
  airedAfterSeasonNumber: z.number().int().nullish(),
  airedAfterEpisodeNumber: z.number().int().nullish(),
  image: z.string().url().nullish(),
  poster: z.string().url().nullish(),
});

// Cursor payload for pagination
export const EpisodeCursorPayloadSchema = z.object({
  pos: z.number().int().nonnegative(),
  hash: z.string(),
});

// Query filters schema
export const EpisodeFiltersSchema = z.object({
  kind: z.string().optional(),
  specialsOnly: z.boolean().optional(),
  start: z.number().int().positive().optional(),
  end: z.number().int().positive().optional(),
}).strict();

// Main query parameters schema
export const EpisodesQuerySchema = z.object({
  malId: z.number().int().positive()
    .describe('MyAnimeList ID for the series'),
  after: z.string().optional()
    .describe('Cursor for forward pagination'),
  before: z.string().optional()
    .describe('Cursor for backward pagination'),
  limit: z.number().int().min(1).max(100).default(25)
    .describe('Number of episodes per page'),
  filters: EpisodeFiltersSchema.optional(),
}).strict();

// Pagination cursors
export const EpisodeCursorsSchema = z.object({
  after: z.string().nullish(),
  before: z.string().nullish(),
});

// Paginated response schema
export const EpisodesPageSchema = z.object({
  data: z.array(EpisodeCanonicalSchema),
  total: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
  cursors: EpisodeCursorsSchema.optional(),
});
```

**File**: `src/package/episodes/episodes.swagger.ts`

**Implementation**:
```typescript
// filepath: /Users/maxwellmapako/Documents/Git/sample-danet/src/package/episodes/episodes.swagger.ts
import { z } from 'zod';
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import {
  EpisodeCanonicalSchema,
  EpisodesPageSchema,
  EpisodesQuerySchema,
} from './episodes.schema.ts';

extendZodWithOpenApi(z);

export const EpisodeCanonicalSwagger = EpisodeCanonicalSchema.openapi({
  title: 'EpisodeCanonical',
  description: 'Canonical episode data merged from multiple sources.',
});

export const EpisodesPageSwagger = EpisodesPageSchema.openapi({
  title: 'EpisodesPage',
  description: 'Paginated response containing episodes with cursor-based navigation.',
});

export const EpisodesQuerySwagger = EpisodesQuerySchema.openapi({
  title: 'EpisodesQuery',
  description: 'Query parameters for fetching episodes with filters and pagination.',
});
```

**File**: `src/package/episodes/episodes.document.ts`

**Implementation**:
```typescript
// filepath: /Users/maxwellmapako/Documents/Git/sample-danet/src/package/episodes/episodes.document.ts
import type { ObjectId, WithId } from 'mongodb';
import type { EpisodeCanonical } from './episodes.types.ts';

/**
 * MongoDB document structure for persisted episode data.
 * Extends the canonical episode with metadata for caching and staleness detection.
 */
export interface EpisodeDocument {
  _id?: ObjectId;
  seriesKey: string; // MAL ID as string for indexing
  airing: boolean | null;
  updatedAt: number; // epoch seconds
  episodes: EpisodeCanonical[];
}

export type EpisodeDocumentWithId = WithId<EpisodeDocument>;
```

#### 2.2 Document & Repository
**File**: `src/package/episodes/episodes.document.ts`

```typescript
import { MergeResult } from './episodes.types.ts';

export interface EpisodeDocument extends MergeResult {
  _id?: ObjectId;
  seriesKey: string; // MAL ID as string
  airing: boolean | null;
  updatedAt: number; // epoch seconds
}
```

**File**: `src/package/episodes/episodes.repository.ts`

**Responsibilities**:
- Load episode document from MongoDB (or undefined if not cached)
- Fetch canonical episodes from Jikan if not cached or stale
- Orchestrate multi-source enrichment (Skyhook, TMDB, Trakt, Notify, Themes)
- Apply merging logic via aggregator helpers
- Persist merged result to MongoDB
- Apply filters (kind, specialsOnly, range)
- Handle cursor-based pagination

**Key Methods**:
- `async invoke(id: number, opts: EpisodesQuery): Promise<EpisodesPage>`

**Dependencies to inject**:
- `MongoService` - Database access
- `CacheService` - Caching layer
- `ExperimentService` - Feature flags
- `LoggerService` - Logging
- Service providers: `JikanService`, `SkyhookService`, `TmdbService`, `TraktService`, `NotifyService`, `ThemeService`, `TheXemService`, `ArmService`

**Implementation Notes**:
- Port aggregator logic from on-the-edge (merge, scope derivation, enrichment)
- Create helper files under `episodes/helpers/` for pagination, filtering, sources
- Use feature flags to gate optional integrations (title similarity, XEM normalization, etc.)
- Implement staleness check similar to `news.repository.ts` (compare timestamps)

#### 2.3 Service Layer
**File**: `src/package/episodes/episodes.service.ts`

**Responsibilities**:
- Validate and parse input query parameters
- Delegate to repository for data fetching
- Handle errors and logging
- Return typed response

**Pattern**: Follow `news.service.ts` - thin service that coordinates repository and handles business rules.

#### 2.4 Controller
**File**: `src/package/episodes/episodes.controller.ts`

```typescript
@Controller('v1/episodes')
export class EpisodeController {
  constructor(private readonly service: EpisodeService) {}

  @Get()
  @ReturnedSchema(EpisodeResponseSchema)
  async list(
    @Query('id') id?: string,
    @Query('after') after?: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
    @Query('kind') kind?: string,
    @Query('specialsOnly') specialsOnly?: string,
    // ... other filter params
  ): Promise<EpisodesPage> {
    const query = EpisodeQuerySchema.parse({ 
      id, after, before, limit, kind, specialsOnly 
    });
    return this.service.getEpisodes(query);
  }
}
```

#### 2.5 Module Definition
**File**: `src/package/episodes/episodes.module.ts`

```typescript
@Module({
  imports: [
    LoggerModule,
    CacheModule,
    DatabaseModule,
    ExperimentModule,
    // Service providers
    JikanModule,
    SkyhookModule,
    TmdbModule,
    TraktModule,
    NotifyModule,
    ThemeModule,
    TheXemModule,
    ArmModule,
  ],
  controllers: [EpisodeController],
  injectables: [EpisodeRepository, EpisodeService],
})
export class EpisodeModule {}
```

#### 2.6 Transformer
**File**: `src/package/episodes/episodes.transformer.ts`

Port transformation logic from on-the-edge:
- Convert Jikan episodes to canonical format
- Enrich with Skyhook metadata
- Merge TMDB data
- Apply Trakt information
- Integrate Notify episodes
- Add theme songs

#### 2.7 Testing
**File**: `src/package/episodes/episodes.service.test.ts`

- Use in-memory collection adapter (similar to on-the-edge test pattern)
- Mock service providers using `@c4spar/mock-fetch`
- Test pagination (forward/backward cursors)
- Test filtering (kind, specials, ranges)
- Test multi-source merging
- Test staleness detection
- Test error handling

### Phase 3: Series Module Migration

#### 3.1 Core Types & Schemas
**File Structure**: Following the established pattern from the `news` module, the type system is organized into four distinct files, each serving a specific purpose:

1. **`series.types.ts`** - TypeScript type definitions
   - Core domain types and interfaces
   - Business logic representations
   - Used throughout the application for type safety

2. **`series.schema.ts`** - Zod schema definitions
   - Runtime validation schemas
   - Input/output validation
   - Query parameter validation
   - Foundation for both Swagger and Types

3. **`series.swagger.ts`** - OpenAPI/Swagger documentation
   - Extends Zod schemas with OpenAPI metadata
   - API documentation annotations
   - Used by Danet's Swagger integration

4. **`series.document.ts`** - MongoDB document types
   - Database persistence schemas
   - Combines domain types with MongoDB metadata (`_id`, etc.)
   - Repository layer types

**Pattern Example** (from `news` module):
- `news.types.ts` → `News`, `NewsPaging` (pure TypeScript types)
- `news.schema.ts` → `NewsSchema`, `NewsPagingSchema` (Zod validation)
- `news.swagger.ts` → `NewsSwagger`, `NewsPagingSwagger` (OpenAPI docs)
- `news.document.ts` → `NewsDocument` (MongoDB persistence)

**File**: `src/package/series/series.types.ts`

**Implementation**:
```typescript
// filepath: /Users/maxwellmapako/Documents/Git/sample-danet/src/package/series/series.types.ts
import { z } from 'zod';
import {
  MediaEntitySchema,
  MediaUnionSchema,
} from './series.schema.ts';

// Core media types inferred from Zod schemas
export type MediaId = 
  | { trakt: number }
  | { tvdb: number }
  | { tmdb: number }
  | { anilist: number }
  | { mal: number }
  | { slug: string };

export type MediaEntity = z.infer<typeof MediaEntitySchema>;
export type MediaUnion = z.infer<typeof MediaUnionSchema>;
```

**File**: `src/package/series/series.schema.ts`

**Implementation**:
```typescript
// filepath: /Users/maxwellmapako/Documents/Git/sample-danet/src/package/series/series.schema.ts
import { z } from 'zod';
import { createPagingSchema } from '@scope/common/utils';

// Media identifier schema
export const MediaIdSchema = z.union([
  z.object({ trakt: z.number().int().positive() }),
  z.object({ tvdb: z.number().int().positive() }),
  z.object({ tmdb: z.number().int().positive() }),
  z.object({ anilist: z.number().int().positive() }),
  z.object({ mal: z.number().int().positive() }),
  z.object({ slug: z.string() }),
]);

// Media title structure
export const MediaTitleSchema = z.object({
  english: z.string().nullish(),
  native: z.string().nullish(),
  romanji: z.string().nullish(),
});

// Media cover image structure
export const MediaCoverImageSchema = z.object({
  url: z.string().url().nullish(),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
});

// Media schedule structure
export const MediaScheduleSchema = z.object({
  day: z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']).nullish(),
  time: z.string().nullish(),
});

// Media network structure
export const MediaNetworkSchema = z.object({
  id: z.number().int().positive().nullish(),
  name: z.string().nullish(),
});

// Media trailer structure
export const MediaTrailerSchema = z.object({
  id: z.string().nullish(),
  site: z.enum(['youtube', 'vimeo']).nullish(),
  url: z.string().url().nullish(),
});

// Core media entity schema
export const MediaEntitySchema = z.object({
  id: MediaIdSchema,
  type: z.enum(['anime', 'manga']),
  title: MediaTitleSchema,
  coverImage: MediaCoverImageSchema,
  description: z.string().nullish(),
  status: z.enum(['airing', 'completed', 'upcoming', 'tba']).nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  episodeCount: z.number().int().nonnegative().nullish(),
  averageScore: z.number().min(0).max(100).nullish(),
  genres: z.array(z.string()).nullish(),
  tags: z.array(z.string()).nullish(),
  relations: z.array(z.object({
    id: z.number().int().positive(),
    type: z.enum(['anime', 'manga']),
  })).nullish(),
  schedule: MediaScheduleSchema,
  network: MediaNetworkSchema,
  trailer: MediaTrailerSchema,
});

// Union of anime and manga metadata
export const MediaUnionSchema = z.union([
  MediaEntitySchema.extend({ type: z.literal('anime') }),
  MediaEntitySchema.extend({ type: z.literal('manga') }),
]);

// Pagination schema for media entities
export const MediaPageSchema = createPagingSchema(MediaEntitySchema);
```

**File**: `src/package/series/series.swagger.ts`

**Implementation**:
```typescript
// filepath: /Users/maxwellmapako/Documents/Git/sample-danet/src/package/series/series.swagger.ts
import { z } from 'zod';
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import {
  MediaEntitySchema,
  MediaUnionSchema,
  MediaPageSchema,
} from './series.schema.ts';

extendZodWithOpenApi(z);

export const MediaEntitySwagger = MediaEntitySchema.openapi({
  title: 'MediaEntity',
  description: 'Complete media entity with metadata for anime or manga.',
});

export const MediaUnionSwagger = MediaUnionSchema.openapi({
  title: 'MediaUnion',
  description: 'Union type for anime and manga metadata.',
});

export const MediaPageSwagger = MediaPageSchema.openapi({
  title: 'MediaPage',
  description: 'Paginated response containing media entities.',
});
```

**File**: `src/package/series/series.document.ts`

**Implementation**:
```typescript
// filepath: /Users/maxwellmapako/Documents/Git/sample-danet/src/package/series/series.document.ts
import type { ObjectId, WithId } from 'mongodb';
import type { MediaEntity } from './series.types.ts';

/**
 * MongoDB document structure for persisted media data.
 * Extends the media entity with metadata for caching and staleness detection.
 */
export interface SeriesDocument {
  _id?: ObjectId;
  mediaId: SeriesId;
  kind: 'anime' | 'manga';
  updatedAt: number;
  data: MediaEntity;
}

export type SeriesDocumentWithId = WithId<SeriesDocument>;
```

#### 3.2 Document & Repository
**File**: `src/package/series/series.document.ts`

```typescript
export interface SeriesDocument {
  _id?: ObjectId;
  mediaId: SeriesId;
  kind: 'anime' | 'manga';
  updatedAt: number;
  data: MediaEntity;
}
```

**File**: `src/package/series/series.repository.ts`

**Responsibilities**:
- Load series from MongoDB with staleness check (4-day threshold)
- Fetch from remote services if not cached or stale
- Aggregate data from all providers (ARM → Jikan → Notify → Skyhook → Themes → Trakt → TMDB)
- Transform remote data to domain model via `seriesTransform`
- Persist to MongoDB
- Return `MediaEntity`

**Key Methods**:
- `async getById(id: { anilist: number }): Promise<MediaEntity | null>`

**Dependencies to inject**:
- `MongoService`
- `CacheService`
- `LoggerService`
- All service providers
- `DateHelper` for staleness comparison

#### 3.3 Service Layer
**File**: `src/package/series/series.service.ts`

**Options**:
1. **Keep current aggregation pattern** - Iterative identifier resolution
2. **Adopt on-the-edge pattern** - Single ID input with full metadata fetch
3. **Hybrid approach** - Support both endpoints

**Recommendation**: Implement hybrid approach:
- `/v1/series/aggregate` - Current aggregation (lightweight, ID resolution only)
- `/v1/series/{id}` - New endpoint with full metadata (from on-the-edge pattern)

This preserves existing API while adding richer functionality.

#### 3.4 Controller
**File**: `src/package/series/series.controller.ts`

```typescript
@Controller('v1/series')
export class SeriesController {
  constructor(private readonly service: SeriesService) {}

  // Keep existing aggregate endpoint
  @Get('aggregate')
  @ReturnedSchema(SeriesAggregateResponseSchema)
  async aggregate(@Query() query: SeriesQuerySchema): Promise<SeriesResponse> {
    return this.service.aggregate(query);
  }

  // Add new metadata endpoint
  @Get(':id')
  @ReturnedSchema(MediaEntitySchema)
  async getById(@Param('id') id: string): Promise<MediaEntity> {
    const anilistId = parseInt(id, 10);
    return this.service.getMetadata({ anilist: anilistId });
  }
}
```

#### 3.5 Transformer
**File**: `src/package/series/series.transformer.ts`

Port `seriesTransform` from on-the-edge:
- Map series identifiers from all services
- Transform title information
- Process cover images and fanart
- Build schedule information
- Map networks and trailers
- Distinguish anime vs manga metadata
- Aggregate all metadata into `MediaEntity`

#### 3.6 Testing
**File**: `src/package/series/series.service.test.ts`

- In-memory collection adapter
- Mock all service providers
- Test identifier resolution
- Test metadata aggregation
- Test anime vs manga handling
- Test staleness detection
- Test caching behavior

### Phase 4: Integration & Polish

#### 4.1 Module Registration
Update `src/app.module.ts` to include new modules:
```typescript
imports: [
  // ... existing
  EpisodeModule,
  SeriesModule, // Updated
]
```

#### 4.2 Swagger Documentation
- Add `@ApiTags()` decorators
- Document all query parameters
- Provide example responses
- Update `episodes.swagger.ts` and `series.swagger.ts`

#### 4.3 Helper Utilities
Create shared helpers under appropriate locations:
- Cursor encoding/decoding → `src/package/episodes/helpers/cursor.ts`
- Filter hash generation → `src/package/episodes/helpers/filter.ts`
- Pagination logic → `src/package/episodes/helpers/paginate.ts`
- Episode merging → `src/package/episodes/helpers/merge.ts`
- Scope derivation → `src/package/episodes/helpers/scope.ts`

#### 4.4 Experiment Flags
Define feature flags in experiment configuration:
- `episode-align-title-sim` - Title similarity threshold
- `episodes-xem-normalize` - TheXEM normalization
- `episodes-multi-source` - Enable multi-source enrichment
- `series-metadata-cache` - Series metadata caching

#### 4.5 Documentation Updates
- Update README with new endpoints
- Document query parameters
- Provide usage examples
- Document caching behavior
- Add troubleshooting section

---

## Testing Strategy

### Unit Tests
- Service layer tests with mocked dependencies
- Repository tests with in-memory collections
- Transformer tests with sample data
- Helper function tests

### Integration Tests
- Controller tests with full DI container
- End-to-end flow tests
- Multi-service coordination tests
- Error handling scenarios

### Test Data
- Create fixtures for:
  - Jikan anime responses
  - Skyhook show data
  - TMDB metadata
  - Trakt information
  - Notify anime data
  - Theme songs
  - TheXEM mappings
  - ARM relations

### Mock Strategy
- Use `@c4spar/mock-fetch` for HTTP mocking
- Create reusable mock builders for common services
- Implement `resetFetch()` in test teardown
- Use in-memory adapters for MongoDB

---

## Risk Mitigation

### Risk 1: Service Layer Incompatibilities
**Impact**: Medium  
**Mitigation**:
- Audit all service methods before migration
- Create adapter layer if needed
- Document API differences
- Add integration tests

### Risk 2: MongoDB Schema Changes
**Impact**: High  
**Mitigation**:
- Design backward-compatible schemas
- Implement migration scripts if needed
- Test with production-like data
- Plan rollback strategy

### Risk 3: Performance Degradation
**Impact**: Medium  
**Mitigation**:
- Implement caching at repository level
- Use staleness checks to reduce external calls
- Add performance monitoring
- Load test before production

### Risk 4: Breaking Existing APIs
**Impact**: High  
**Mitigation**:
- Version new endpoints (v2)
- Or maintain backward compatibility
- Document changes clearly
- Provide migration guide for consumers

### Risk 5: Missing Dependencies
**Impact**: Medium  
**Mitigation**:
- Identify missing utilities early
- Port only essential helpers
- Document deferred functionality
- Create follow-up issues

---

## Implementation Checklist

### Prerequisites
- [ ] Audit all services in `@scope/service/*`
- [ ] Verify MongoDB setup and collection interfaces
- [ ] Review experiment service configuration
- [x] Set up test infrastructure with mocking (Phases 1-5 complete - see `test-infrastructure-summary.md`)

### Episodes Module
- [ ] Create comprehensive type definitions
- [ ] Implement Zod schemas
- [ ] Port aggregator and merge logic
- [ ] Implement repository with MongoDB integration
- [ ] Create service layer
- [ ] Update controller
- [ ] Port transformer logic
- [ ] Create helper utilities (cursor, filter, pagination, etc.)
- [ ] Write comprehensive tests
- [ ] Update module definition
- [ ] Add Swagger documentation

### Series Module
- [ ] Create comprehensive type definitions
- [ ] Implement Zod schemas
- [ ] Port transformer logic
- [ ] Implement repository with MongoDB integration
- [ ] Extend service layer (hybrid approach)
- [ ] Update controller with new endpoint
- [ ] Write comprehensive tests
- [ ] Update module definition
- [ ] Add Swagger documentation

### Integration
- [ ] Register modules in `app.module.ts`
- [ ] Test end-to-end flows
- [ ] Verify caching behavior
- [ ] Validate experiment flag integration
- [ ] Performance testing
- [ ] Update README and documentation

### Quality Gates
- [ ] `deno fmt` passes
- [ ] `deno lint` passes
- [ ] `deno task test` passes with new tests
- [ ] Integration tests pass
- [ ] API documentation complete
- [ ] Code review completed

---

## Timeline Estimate

### Phase 1: Foundation (3-5 days)
### Phase 1: Preparation (3-4 days)
- Service audit and gap analysis
- MongoDB interface design
- Type system alignment
- [x] Test infrastructure setup (Complete - see `test-infrastructure-summary.md`)

### Phase 2: Episodes Migration (5-7 days)
- Types and schemas (1 day)
- Repository implementation (2 days)
- Service and controller (1 day)
- Transformer and helpers (1-2 days)
- Testing (1-2 days)

### Phase 3: Series Migration (4-6 days)
- Types and schemas (1 day)
- Repository implementation (1-2 days)
- Service and controller updates (1 day)
- Transformer (1 day)
- Testing (1-2 days)

### Phase 4: Integration & Polish (2-3 days)
- Module registration
- Swagger documentation
- End-to-end testing
- Documentation updates

**Total Estimate**: 14-21 days

---

## Success Criteria

1. **Functional Parity**
   - All on-the-edge features implemented
   - Existing sample-danet functionality preserved
   - No regression in API behavior

2. **Code Quality**
   - Follows established patterns from `config` and `news`
   - Comprehensive test coverage (>80%)
   - All lint and format checks pass
   - Well-documented code and APIs

3. **Performance**
   - Response times comparable to on-the-edge
   - Effective caching reduces external API calls
   - No memory leaks or resource issues

4. **Maintainability**
   - Clear separation of concerns
   - Reusable components and helpers
   - Comprehensive documentation
   - Easy to extend and modify

5. **Integration**
   - Seamless service layer integration
   - Proper DI throughout
   - Experiment flags functional
   - MongoDB operations efficient

---

## Follow-up Work

### Immediate
- Monitor production performance
- Gather user feedback
- Address any edge cases discovered

### Short-term
- Optimize caching strategies
- Add more experiment flags for feature toggles
- Enhance error messages and logging
- Add metrics and monitoring

### Long-term
- Consider GraphQL endpoints for richer queries
- Implement real-time updates via WebSockets
- Add search and filtering capabilities
- Explore data synchronization strategies

---

## References

### Source Repositories
- **on-the-edge**: https://github.com/AniTrend/on-the-edge
  - Episodes: `/src/episodes`
  - Series: `/src/series`

### Reference Implementations
- **Config module**: `src/package/config/`
- **News module**: `src/package/news/`
- **ARM service**: `src/service/arm/`

### Documentation
- Repository guidelines: `AGENTS.md`
- Context instructions: `.github/instructions/context.instructions.md`
- Service refactor contract: `docs/service-layer-refactor-contract.md`
- Cross-package imports: `docs/cross-package-import-refactor.md`

### Tools & Patterns
- **Danet framework**: DI, decorators, modules
- **Zod**: Schema validation
- **MongoDB**: Persistence layer
- **@c4spar/mock-fetch**: HTTP mocking in tests
- **RequestClient**: Shared HTTP client from `@scope/client`

---

## Appendix A: Key Differences

| Aspect | on-the-edge | sample-danet |
|--------|-------------|--------------|
| Framework | Oak (Deno HTTP) | Danet (NestJS-like DI) |
| Routing | Router with async handlers | Decorators (`@Controller`, `@Get`) |
| DI | Manual instantiation | Automatic via `@Injectable` |
| Validation | Manual parsing | Zod schemas with `@danet/zod` |
| Services | Direct function imports | Injected service classes |
| MongoDB | Direct Collection interface | Via `MongoService` |
| Context | `AppContext` with state | Injected dependencies |
| Features | `Features` interface | `ExperimentService` |
| Error Handling | Manual status codes | Danet exceptions |

## Appendix B: Service Method Mapping

| on-the-edge Function | sample-danet Service Method |
|---------------------|----------------------------|
| `getJikanAnime(id)` | `jikanService.getAnime(id)` |
| `getJikanEpisodes(id)` | `jikanService.getAnime(id, { episodes: true })` |
| `getSkyhookShow(tvdb)` | `skyhookService.getShowByTvdb(tvdb)` |
| `getTmdbShow(id)` | `tmdbService.getShow(id)` |
| `getTmdbSeason(id, season)` | `tmdbService.getSeason(id, season)` |
| `getTraktShow(id)` | `traktService.getShow(id)` |
| `getNotifyAnime(id)` | `notifyService.getAnime(id)` |
| `getThemesForAnime(id)` | `themeService.getThemes(id)` |
| `getTheXemByTvdb(id)` | `thexemService.getMappingsByTvdb(id)` |
| `getAniListRelationId(id)` | `armService.getAniListRelationId(id)` |

## Appendix C: File Structure Comparison

### Episodes Module

**on-the-edge**:
```
src/episodes/
├── episodes.controller.ts
├── episodes.params.ts
├── episodes.types.ts
├── index.ts
├── aggregator/
│   ├── merge.ts
│   └── types.ts
├── collection/
│   └── episode.collection.ts
├── helpers/
│   ├── scope.ts
│   └── sources.ts
├── repository/
│   ├── episodes.repository.ts
│   ├── season.repository.ts
│   └── helpers/
│       ├── cursor.ts
│       ├── enrichers.ts
│       ├── filters.ts
│       ├── loader.ts
│       ├── paginate.ts
│       ├── sources.ts
│       └── stats.ts
├── store/
│   └── types.ts
└── tests/
    ├── episodes.test.ts
    ├── episodes.controller.test.ts
    └── episodes.*.test.ts
```

**sample-danet (target)**:
```
src/package/episodes/
├── episodes.controller.ts
├── episodes.service.ts
├── episodes.repository.ts
├── episodes.document.ts
├── episodes.transformer.ts
├── episodes.schema.ts
├── episodes.types.ts
├── episodes.swagger.ts
├── episodes.module.ts
├── episodes.service.test.ts
├── index.ts
└── helpers/
    ├── cursor.ts
    ├── filter.ts
    ├── merge.ts
    ├── paginate.ts
    ├── scope.ts
    └── sources.ts
```

### Series Module

**on-the-edge**:
```
src/series/
├── controller.ts
├── types.ts
├── index.ts
├── local/
│   ├── index.ts
│   ├── series.local.source.ts
│   ├── series.local.transformer.ts
│   └── types.ts
├── repository/
│   ├── index.ts
│   ├── series.repository.ts
│   └── helpers/
│       └── qualifier.ts
└── transformer/
    ├── index.ts
    ├── series.transformer.ts
    └── series.*.transformer.test.ts
```

**sample-danet (target)**:
```
src/package/series/
├── series.controller.ts
├── series.service.ts
├── series.repository.ts
├── series.document.ts
├── series.transformer.ts
├── series.schema.ts
├── series.types.ts
├── series.swagger.ts
├── series.module.ts
├── series.service.test.ts
└── index.ts
```

---

## Document Metadata

- **Created**: 2025-01-07
- **Author**: AI Assistant
- **Purpose**: Migration planning document for episodes and series modules
- **Status**: Draft
- **Review Required**: Yes
