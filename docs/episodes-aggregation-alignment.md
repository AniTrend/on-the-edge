# Episodes Package Alignment Plan

**Date**: 12 October 2025  
**Target**: Align local episodes implementation with [on-the-edge/dev/src/episodes](https://github.com/AniTrend/on-the-edge/tree/dev/src/episodes)  
**Status**: 📋 Planning Phase - Awaiting Review  
**Last Updated**: 12 October 2025 (Type System & DI Pattern Corrections)

> **Important**: This plan has been updated to strictly follow this project's established architectural patterns observed in `series`, `news`, and `config` packages. Key corrections include:
> - ✅ Proper Injectable DI pattern (Service → Repository → Resolver)
> - ✅ Swagger-derived type system (schema → types → document → swagger)
> - ✅ MongoCollectionAdapter inline (no custom collection interface)
> - ✅ Pure helper functions (not classes)

---

## Executive Summary

This document outlines a comprehensive plan to align the current Jikan-only episodes implementation with the reference multi-source aggregation architecture from `on-the-edge`. The alignment focuses on implementing consistent episode aggregation logic while **strictly adhering to this project's established architectural patterns**.

### Current State
- ✅ Single-source (Jikan) episode fetching
- ✅ Cursor-based pagination
- ✅ TTL-based caching (12h airing, 7d completed)
- ✅ Basic filtering (kind, range, specials)
- ❌ No multi-source aggregation
- ❌ No merge logic or conflict resolution
- ❌ Missing Injectable repository pattern
- ❌ Inconsistent type system (not swagger-derived)

### Target State
- ✅ Multi-source aggregation (Jikan + Skyhook + TMDB + Trakt + Notify + Themes)
- ✅ Intelligent episode merging with conflict detection
- ✅ Fuzzy title matching using Dice coefficient
- ✅ Feature-flag gated experimental behaviors
- ✅ **Proper DI pattern: Service → Repository → Resolver** (like series package)
- ✅ **Swagger-derived type system** (schema → types → document → swagger)
- ✅ **MongoCollectionAdapter inline** (no custom collection interface)
- ✅ Comprehensive merge diagnostics

### Key Architectural Patterns (Project Standards)

#### 1. Dependency Injection Flow
```
EpisodeService (Injectable)
  ↓ injects
EpisodesRepository (Injectable)
  ↓ injects
EpisodesResolver (Injectable)
  ↓ creates inline
MongoCollectionAdapter
```

#### 2. Type System Flow
```
episodes.schema.ts (Zod schemas)
  ↓ z.infer
episodes.types.ts (TypeScript types)
  ↓ extends
episodes.document.ts (MongoDB Document)
  ↓ .openapi
episodes.swagger.ts (OpenAPI specs)
```

#### 3. Repository Pattern
- Injectable via `@Injectable()` decorator
- Accepts dependencies via constructor (MongoService, Resolver, Logger)
- Creates `MongoCollectionAdapter` inline (getter or constructor)
- No custom collection interface needed

#### 4. Resolver Pattern (Multi-Source)
- Injectable separate class (like `SeriesResolver`)
- Orchestrates all external service calls
- Returns canonical domain types
- Repository calls resolver, then persists results

---

## Architectural Comparison

### Current Implementation Structure
```
src/package/episodes/
├── episodes.controller.ts       # API endpoint
├── episodes.service.ts          # Service layer (creates repo inline)
├── episodes.transformer.ts      # Simple Jikan → Canonical transform
├── episodes.types.ts            # Basic types
├── episodes.schema.ts           # Zod schemas
├── episodes.document.ts         # Cache document type
├── episodes.swagger.ts          # OpenAPI spec
├── episodes.module.ts           # DI module
├── index.ts                     # Exports
└── repository/
    ├── episodes.repository.ts   # Repository logic
    └── helpers/
        ├── cursor.ts            # Cursor encoding/decoding
        ├── filters.ts           # Filter application
        ├── loader.ts            # Cache load/persist/fetch
        ├── paginate.ts          # Pagination logic
        └── index.ts
```

### Target Implementation Structure (Aligned to Project Patterns)
```
src/package/episodes/
├── episodes.controller.ts       # API endpoint
├── episodes.service.ts          # Injectable, thin validation layer
├── episodes.types.ts            # Extended types with merge metadata
├── episodes.schema.ts           # Zod schemas
├── episodes.swagger.ts          # OpenAPI spec
├── episodes.module.ts           # DI wiring (updated with new injectables)
├── index.ts                     # Public API
├── transformer/                 # ⭐ REORGANIZED: Dedicated folder
│   └── canonical.ts            # Jikan → Canonical transform
├── aggregator/                  # ⭐ NEW: Merge orchestration (pure functions)
│   ├── merge.ts                # Core merge algorithm
│   └── types.ts                # Merge context, result, conflicts
└── repository/                  # ⭐ ENHANCED: Injectable with Resolver
    ├── index.ts                # Exports
    ├── episodes.repository.ts  # Injectable, creates MongoCollectionAdapter inline
    ├── episodes.resolver.ts    # ⭐ NEW: Injectable, multi-source orchestration
    ├── episodes.document.ts    # Storage types (keep here, not separate store/)
    └── helpers/                # Pure functions (not classes)
        ├── cursor.ts           # Existing
        ├── filters.ts          # Existing
        ├── loader.ts           # Existing (updated for MergeResult)
        ├── paginate.ts         # Existing
        ├── scope.ts            # ⭐ NEW: Season scope derivation
        ├── sources.ts          # ⭐ NEW: Source slice fetching
        ├── stats.ts            # ⭐ NEW: Merge statistics
        ├── xem.ts              # ⭐ NEW: TheXem normalization
        └── index.ts            # Exports
```

**Key Pattern Alignment:**
- ✅ Repository is Injectable (like series/news)
- ✅ Resolver is Injectable (like SeriesResolver)
- ✅ MongoCollectionAdapter created inline (like series getter pattern)
- ✅ Helpers are pure functions (not classes)
- ✅ Document types stay in repository/ folder
- ✅ No custom collection interface (uses existing adapter)

---

## Key Differences Analysis

### 1. Data Flow Architecture

**Current Flow:**
```
Controller → Service → Repository → [Load Cache OR Fetch Jikan] → Filter → Paginate → Response
```

**Target Flow (This Project):**
```
Controller → Service (Injectable) → Repository (Injectable) → Resolver (Injectable) → [Multi-Source Services]
                ↓                           ↓                           ↓
           Validation              MongoCollectionAdapter      JikanService, SkyhookService,
                                   (created inline)             TmdbService, TraktService, etc.
                                           ↓                           ↓
                                   MongoDB Collection          Aggregate & Merge
                                                                       ↓
                                                              Return MergeResult
```

**Key Pattern:**
- Service validates and delegates
- Repository manages caching and persistence
- Resolver orchestrates multi-source fetching
- All components are Injectable (proper DI)

### 2. Type System Enhancements

#### Current: Basic EpisodeCanonical
```typescript
interface EpisodeCanonical {
  id: number;
  number: number | null;
  title: EpisodeTilte | null;
  synopsis: string | null;
  aired: Instant | null;
  score: number | null;
  kind: EpisodeKind | null;
  duration: number | null;
  url: string | null;
  // Provider IDs (null for now)
  tvdbShowId: number | null;
  tvdbId: number | null;
  tmdbId: number | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  absoluteEpisodeNumber: number | null;
  // ... other positioning fields
  image: string | null;
  poster: string | null;
  // ❌ NO themes
  // ❌ NO source tracking
  // ❌ NO conflict metadata
}
```

#### Reference: MergedEpisode (extends Canonical)
```typescript
interface EpisodeCanonical {
  // ... all fields above PLUS:
  themes: {                           // ⭐ Added from Jikan themes API
    openings: string[];
    endings: string[];
  };
}

interface MergedEpisode extends EpisodeCanonical {
  sources: SourceType[];              // ⭐ Track data provenance
  conflictReasons?: ConflictReason[]; // ⭐ Detect merge conflicts
  alignmentKey?: {                    // ⭐ Merge alignment metadata
    num: number;
    day?: number;
    kind?: EpisodeKind;
  };
}

type SourceType = 'JIKAN' | 'SKYHOOK' | 'TMDB' | 'TRAKT' | 'NOTIFY' | 'THEMES';
type ConflictReason = 'TITLE' | 'DURATION' | 'AIR_DATE' | 'ORPHAN';
```

### 3. Collection Abstraction

**Current:** Direct MongoDB adapter usage
```typescript
// In episodes.service.ts
const mongoCollection = this.mongo.collection<EpisodeDocument>('episodes');
const collection = new MongoCollectionAdapter(mongoCollection);
const repository = new EpisodesRepository(collection, this.jikan);
```

**Target (This Project):** Use existing MongoCollectionAdapter with Injectable pattern
```typescript
// In episodes.repository.ts (follows series pattern)
@Injectable()
export class EpisodesRepository {
  private readonly COLLECTION_NAME = 'episodes';

  constructor(
    private readonly mongo: MongoService,
    private readonly resolver: EpisodesResolver,
    private readonly logger: LoggerService,
  ) {}

  // Create adapter inline via getter (like SeriesRepository)
  private get collection(): Collection<EpisodeDocument> {
    return new MongoCollectionAdapter(
      this.mongo.collection<EpisodeDocument>(this.COLLECTION_NAME),
    );
  }

  async invoke(query: EpisodeQuery): Promise<EpisodesContainer> {
    // Use this.collection throughout
    const cached = await load(this.collection, seriesKey);
    // ...
  }
}

// In episodes.service.ts (DI pattern)
@Injectable()
export class EpisodeService {
  constructor(
    private readonly repository: EpisodesRepository,  // Injected, not created
    private readonly logger: LoggerService,
  ) {}
}
```

**Benefits:**
- ✅ Follows established project patterns (series/news)
- ✅ Uses existing `Collection<T>` interface from `@scope/database/collection`
- ✅ Proper DI with Injectable decorators
- ✅ No custom abstraction layer needed

### 4. Type System Architecture

**Current:** Inconsistent - some types hardcoded, no swagger derivation

**Target:** Swagger-derived type flow (matches config/series/news pattern)

**Pattern:**
```
1. episodes.schema.ts      → Zod schemas (source of truth)
2. episodes.types.ts       → z.infer<typeof Schema> (TypeScript types)
3. episodes.document.ts    → Document & Type (MongoDB shape)
4. episodes.swagger.ts     → Schema.openapi() (OpenAPI specs)
```

**Example Flow:**
```typescript
// 1. Define Zod schema
export const EpisodeCanonicalSchema = z.object({
  id: z.number(),
  title: z.string(),
  themes: z.object({
    openings: z.array(z.string()),
    endings: z.array(z.string()),
  }),
});

// 2. Infer TypeScript type
export type EpisodeCanonical = z.infer<typeof EpisodeCanonicalSchema>;

// 3. Extend for MongoDB
export type EpisodeDocument = Document & {
  seriesKey: string;
  episodes: EpisodeCanonical[];
};

// 4. Generate OpenAPI spec
export const EpisodeSwagger = EpisodeCanonicalSchema.openapi({
  title: 'Episode',
  description: 'Canonical episode representation',
});
```

**Benefits:**
- ✅ Single source of truth (Zod schema)
- ✅ Type safety at compile time
- ✅ Runtime validation with same schemas
- ✅ Automatic OpenAPI generation
- ✅ Consistent with all other packages

### 4. Merge Algorithm

**Current:** No merging (Jikan is the only source)

**Reference:** Sophisticated multi-source merge with:

1. **Primary Source Selection**
   - Prefers runtime-specified source (configurable)
   - Falls back to JIKAN as default primary
   - Sorts primary episodes by episode number

2. **Episode Alignment** (3 fallback strategies)
   ```typescript
   // Strategy 1: Direct number match (preferred)
   if (index.has(episodeNumber)) { /* merge into existing */ }
   
   // Strategy 2: Air date proximity (±2 days tolerance)
   if (Math.abs(primaryDay - secondaryDay) <= 2) { /* align by date */ }
   
   // Strategy 3: Fuzzy title matching (Dice coefficient)
   const similarity = diceCoefficient(normalizedTitle1, normalizedTitle2);
   if (similarity >= threshold) { /* align by title */ }
   
   // Strategy 4: Orphan (no match found)
   // Keep as separate episode with ORPHAN conflict reason
   ```

3. **Conflict Detection**
   ```typescript
   // Title conflict: Different normalized titles
   if (norm(title1) !== norm(title2)) conflicts.push('TITLE');
   
   // Duration conflict: >2 minute difference
   if (Math.abs(duration1 - duration2) > 2) conflicts.push('DURATION');
   
   // Air date drift: >2 days difference
   if (Math.abs(day1 - day2) > 2) conflicts.push('AIR_DATE');
   ```

4. **Field Enrichment Preferences**
   ```typescript
   // Priority order for runtime/metadata fields:
   // TMDB > JIKAN > SKYHOOK/TRAKT/NOTIFY
   
   if (source === 'TMDB') {
     // Overwrite duration, poster, image, synopsis if present
     // Add tmdbId, seasonNumber, episodeNumber
   } else if (source === 'THEMES') {
     // Union merge themes (openings/endings)
   } else {
     // Only fill missing fields (non-destructive)
   }
   ```

5. **Bigram Dice Coefficient** (fuzzy string matching)
   ```typescript
   // Normalized title: lowercase, alphanumeric only
   const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '');
   
   // Bigram generation: "hello" → ["he", "el", "ll", "lo"]
   // Dice coefficient: (2 * overlap) / (total bigrams)
   // Returns: 0.0 (no match) to 1.0 (perfect match)
   // Threshold: typically 0.7-0.8 for fuzzy anime titles
   ```

### 5. Feature Flag Integration

**Current:** No feature flags

**Reference:** Feature-gated behaviors
```typescript
// From AppFeatures
interface AppFeatures {
  'episode-align-title-sim'?: number;  // Threshold 0..1, undefined = disabled
  // Future: 'enable-xem-normalization'?: boolean;
}

// Usage in repository
const titleSimThreshold = getTitleSimThreshold(this.features);
const normalizeXem = isXemNormalizationEnabled(this.features);

// Merge with configurable threshold
mergeEpisodes(
  { preferRuntime: 'JIKAN', titleSimThreshold },
  slices
);
```

**Benefits:**
- ✅ Safe rollout of experimental features
- ✅ A/B testing merge strategies
- ✅ Gradual multi-source enablement
- ✅ Easy rollback if issues arise

### 6. Source Orchestration

**Reference Implementation:**
```typescript
// Phase A: Fetch primary source (always Jikan)
const { airing, episodes } = await fetchCanonical(seriesKey, malId);
const slices = [{ source: 'JIKAN', episodes }];

// Phase B: Resolve relation IDs (AniList → TVDB/TMDB/etc)
const relation = opts.relation ?? await getAniListRelationId(malId);

if (relation) {
  // Phase C: Derive season scope (align Jikan ↔ TVDB structure)
  const { pairs, stats } = deriveSeasonScope(episodes, skyhookShow, threshold);
  
  // Phase D: Fetch secondary sources in parallel
  const [skyhookSlice, tmdbSlice, notifySlice, traktSlice] = await Promise.all([
    getSkyhookSliceAlignedToScope({ relation, skyhookShow, scopePairs, normalizeXem }),
    getTmdbSliceForScope({ relation, scopePairs, skyhookShow }),
    getNotifyEpisodeSliceByCanonical({ relation, canonical: episodes }),
    getTraktSlice(relation),
  ]);
  
  // Phase E: Collect all valid slices
  if (skyhookSlice.slice) slices.push(skyhookSlice.slice);
  if (tmdbSlice) slices.push(tmdbSlice);
  // ... etc
}

// Phase F: Merge all slices with conflict detection
const mergeResult = mergeEpisodes({ preferRuntime: 'JIKAN', titleSimThreshold }, slices);

// Phase G: Log merge statistics (for monitoring)
logMergeStats(mergeResult.episodes, { titleSim: threshold }, xemRemapped);
```

---

## Implementation Phases

### Phase 1: Structural Foundation 🏗️
**Goal**: Create architectural scaffolding following project DI patterns

#### 1.1 Refactor to Injectable Pattern
- **Make `EpisodesRepository` Injectable** (currently created inline in service)
- **Create `EpisodesResolver` Injectable** for multi-source orchestration
- **Update DI wiring** in `episodes.module.ts`
- **Pattern**: Follow `series` package (Service → Repository → Resolver)

#### 1.2 Move Storage Types
- **File**: `src/package/episodes/repository/episodes.document.ts` (already exists, move here if needed)
- **Keep**: `EpisodeDocument` in repository folder (matches series/news pattern)
- **No separate store/ module** - keep document types with repository

#### 1.3 Create `aggregator/` Module
- **File**: `src/package/episodes/aggregator/merge.ts`
- **Implementation**: Core `mergeEpisodes()` function with Dice coefficient
- **File**: `src/package/episodes/aggregator/types.ts`
- **Types**: `EpisodeSourceSlice`, `MergeContext`, `MergeResult`, `ConflictReason`

#### 1.4 Reorganize `transformer/`
- **From**: `episodes.transformer.ts` (file)
- **To**: `transformer/canonical.ts` (folder)
- **Keep**: Existing `toCanonicalEpisode` logic
- **Add**: Support for themes field

#### 1.5 Expand `repository/helpers/`
- **Add**: `repository/helpers/sources.ts` - Pure functions for source slice fetching
- **Add**: `repository/helpers/scope.ts` - Pure functions for season scope derivation
- **Add**: `repository/helpers/stats.ts` - Pure functions for merge statistics logging
- **Add**: `repository/helpers/xem.ts` - Pure functions for TheXem normalization (stub for now)
- **Keep**: Existing cursor, filters, loader, paginate as pure functions
- **Pattern**: All helpers are pure functions, not classes (matches series pattern)

**Deliverable**: Injectable Repository/Resolver, pure helper functions, no behavior changes yet

---

### Phase 2: Type System Updates 📝
**Goal**: Properly structure types following project's swagger-derived pattern

**Type Flow Pattern (Project Standard):**
```
episodes.schema.ts (Zod schemas)
    ↓ (z.infer)
episodes.types.ts (TypeScript types)
    ↓ (extends/augments)
episodes.document.ts (MongoDB Document types)
    ↓ (.openapi extension)
episodes.swagger.ts (OpenAPI specs)
```

#### 2.1 Update `episodes.schema.ts` (Zod Source of Truth)
```typescript
import { z } from 'zod';

// Episode kind taxonomy
export const EpisodeKindSchema = z.enum([
  'main', 'ova', 'ona', 'recap', 'filler', 'special'
]);

// Episode title (multi-language)
export const EpisodeTitleSchema = z.object({
  english: z.string().nullish(),
  romanji: z.string().nullish(),
  native: z.string().nullish(),
});

// Episode themes (openings/endings)
export const EpisodeThemesSchema = z.object({
  openings: z.array(z.string()).default([]),
  endings: z.array(z.string()).default([]),
});

// Canonical episode from primary source (Jikan)
export const EpisodeCanonicalSchema = z.object({
  id: z.number(),
  number: z.number().nullish(),
  title: EpisodeTitleSchema.nullish(),
  synopsis: z.string().nullish(),
  aired: z.number().nullish(),  // Instant (epoch seconds)
  score: z.number().nullish(),
  kind: EpisodeKindSchema.nullish(),
  duration: z.number().nullish(),  // minutes
  url: z.string().url().nullish(),
  // Provider IDs (populated during merge)
  tvdbShowId: z.number().nullish(),
  tvdbId: z.number().nullish(),
  tmdbId: z.number().nullish(),
  seasonNumber: z.number().nullish(),
  episodeNumber: z.number().nullish(),
  absoluteEpisodeNumber: z.number().nullish(),
  airedBeforeSeasonNumber: z.number().nullish(),
  airedBeforeEpisodeNumber: z.number().nullish(),
  airedAfterSeasonNumber: z.number().nullish(),
  airedAfterEpisodeNumber: z.number().nullish(),
  image: z.string().url().nullish(),
  poster: z.string().url().nullish(),
  themes: EpisodeThemesSchema.default({ openings: [], endings: [] }),
});

// Source type for multi-source aggregation
export const SourceTypeSchema = z.enum([
  'JIKAN', 'SKYHOOK', 'TMDB', 'TRAKT', 'NOTIFY', 'THEMES'
]);

// Conflict reasons during merge
export const ConflictReasonSchema = z.enum([
  'TITLE', 'DURATION', 'AIR_DATE', 'ORPHAN'
]);

// Merged episode with source tracking
export const MergedEpisodeSchema = EpisodeCanonicalSchema.extend({
  sources: z.array(SourceTypeSchema),
  conflictReasons: z.array(ConflictReasonSchema).optional(),
  alignmentKey: z.object({
    num: z.number(),
    day: z.number().optional(),
    kind: EpisodeKindSchema.optional(),
  }).optional(),
});

// Query parameters
export const EpisodeQuerySchema = z.object({
  malId: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().min(1).max(100).default(25).optional(),
  after: z.string().optional(),  // EntityCursor (opaque)
  before: z.string().optional(), // EntityCursor (opaque)
  kind: EpisodeKindSchema.optional(),
  specialsOnly: z.coerce.boolean().optional(),
  start: z.coerce.number().int().positive().optional(),
  end: z.coerce.number().int().positive().optional(),
});

// Paginated response container
export const EpisodesContainerSchema = z.object({
  data: z.array(EpisodeCanonicalSchema),  // Return canonical (strip merge metadata)
  next: z.string().nullish(),
  previous: z.string().nullish(),
  first: z.string().nullish(),
  last: z.string().nullish(),
  total: z.number(),
});
```

#### 2.2 Update `episodes.types.ts` (Inferred from Schemas)
```typescript
import { z } from 'zod';
import {
  EpisodeCanonicalSchema,
  EpisodeKindSchema,
  EpisodeQuerySchema,
  EpisodesContainerSchema,
  EpisodeThemesSchema,
  EpisodeTitleSchema,
  MergedEpisodeSchema,
  SourceTypeSchema,
  ConflictReasonSchema,
} from './episodes.schema.ts';

// Infer types from schemas (single source of truth)
export type EpisodeKind = z.infer<typeof EpisodeKindSchema>;
export type EpisodeTitle = z.infer<typeof EpisodeTitleSchema>;
export type EpisodeThemes = z.infer<typeof EpisodeThemesSchema>;
export type EpisodeCanonical = z.infer<typeof EpisodeCanonicalSchema>;
export type SourceType = z.infer<typeof SourceTypeSchema>;
export type ConflictReason = z.infer<typeof ConflictReasonSchema>;
export type MergedEpisode = z.infer<typeof MergedEpisodeSchema>;
export type EpisodeQuery = z.infer<typeof EpisodeQuerySchema>;
export type EpisodesContainer = z.infer<typeof EpisodesContainerSchema>;

// Additional types for internal use (not schema-derived)
export interface EpisodeFilters {
  kind?: EpisodeKind;
  specialsOnly?: boolean;
  start?: number;
  end?: number;
}
```

#### 2.3 Update `episodes.document.ts` (MongoDB Shape)
```typescript
import { Document } from 'mongodb';
import { MergedEpisode } from './episodes.types.ts';
import { Instant } from '@scope/common/utils';

// MongoDB document shape (extends domain type)
export type EpisodeDocument = Document & {
  seriesKey: string;
  airing: boolean;
  updatedAt: Instant;  // epoch seconds
  episodes: MergedEpisode[];  // Store with merge metadata
};
```

#### 2.4 Update `episodes.swagger.ts` (OpenAPI Extension)
```typescript
import { z } from 'zod';
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { EpisodesContainerSchema } from './episodes.schema.ts';

extendZodWithOpenApi(z);

export const EpisodeSwagger = EpisodesContainerSchema.openapi({
  title: 'Episodes',
  description: 'Paginated episodes response with cursor-based navigation',
});
```

#### 2.5 Create `aggregator/types.ts` (Merge-specific types)
```typescript
import { z } from 'zod';
import { EpisodeCanonical, MergedEpisode, SourceType } from '../episodes.types.ts';

// Source slice for aggregation
export interface EpisodeSourceSlice {
  source: SourceType;
  episodes: EpisodeCanonical[];
}

// Merge configuration
export interface MergeContext {
  preferRuntime: SourceType;
  titleSimThreshold?: number;
}

// Merge output
export interface MergeResult {
  episodes: MergedEpisode[];
}
```

**Deliverable**: Swagger-derived type system following project patterns (schema → types → document → swagger)

---

### Phase 3: Repository Refactoring 🔄
**Goal**: Follow project's DI pattern with Injectable Repository and Resolver

#### 3.1 Update `episodes.service.ts`
```typescript
// Before (WRONG - breaks DI pattern):
const mongoCollection = this.mongo.collection<EpisodeDocument>('episodes');
const collection = new MongoCollectionAdapter(mongoCollection);
const repository = new EpisodesRepository(collection, this.jikan);

// After (CORRECT - follows series/news pattern):
@Injectable()
export class EpisodeService {
  constructor(
    private readonly repository: EpisodesRepository,  // Inject repository
    private readonly logger: LoggerService,
  ) {}
  
  async getEpisodes(query: EpisodeQuery): Promise<EpisodesContainer> {
    // Validation only - delegate to repository
    if (!query.malId) throw new BadRequestException();
    return await this.repository.invoke(query);
  }
}
```

#### 3.2 Update `repository/episodes.repository.ts`
```typescript
// Make Injectable and follow series pattern
@Injectable()
export class EpisodesRepository {
  private readonly COLLECTION_NAME = 'episodes';

  constructor(
    private readonly mongo: MongoService,           // Inject MongoService
    private readonly resolver: EpisodesResolver,    // Inject resolver
    private readonly experiment: ExperimentService, // Inject for features
    private readonly logger: LoggerService,
  ) {}

  // Create adapter inline (series uses getter, news uses constructor)
  private get collection(): Collection<EpisodeDocument> {
    return new MongoCollectionAdapter(
      this.mongo.collection<EpisodeDocument>(this.COLLECTION_NAME),
    );
  }

  async invoke(query: EpisodeQuery): Promise<EpisodesContainer> {
    const seriesKey = buildSeriesKey(query);
    
    // Check cache
    const cached = await load(this.collection, seriesKey);
    if (cached) {
      return this.paginate(cached, query);
    }
    
    // Resolve multi-source data via resolver
    const aggregated = await this.resolver.resolve(query);
    
    // Persist and paginate
    const persisted = await persist(this.collection, seriesKey, aggregated);
    return this.paginate(persisted, query);
  }
}
```

#### 3.3 Create `repository/episodes.resolver.ts`
```typescript
// NEW - Multi-source orchestration (like SeriesResolver)
@Injectable()
export class EpisodesResolver {
  constructor(
    private readonly jikan: JikanService,
    private readonly arm: ArmService,
    private readonly experiment: ExperimentService,
    private readonly logger: LoggerService,
    // Future: inject other services (Skyhook, TMDB, Trakt, Notify, Theme, TheXem)
  ) {}

  async resolve(query: EpisodeQuery): Promise<MergeResult> {
    // Initially: just fetch from Jikan (existing behavior)
    const { airing, episodes } = await fetchCanonical(this.jikan, query.malId);
    const slices: EpisodeSourceSlice[] = [{ source: 'JIKAN', episodes }];
    
    // Future multi-source expansion point:
    // const relation = await this.arm.getRelationsById('mal', query.malId);
    // const secondarySlices = await this.fetchSecondarySlices(relation, episodes);
    // slices.push(...secondarySlices);
    
    // Merge all slices
    const titleSimThreshold = this.experiment.getFeatureValue('episode-align-title-sim');
    return mergeEpisodes({ preferRuntime: 'JIKAN', titleSimThreshold }, slices);
  }
}
```

#### 3.4 Update `repository/helpers/loader.ts`
```typescript
// Pure functions - accept Collection interface (already correct pattern)
export async function load(
  collection: Collection<EpisodeDocument>,  // Use existing Collection interface
  seriesKey: string,
): Promise<EpisodeDocument | undefined> {
  // ... existing logic unchanged
}

export async function persist(
  collection: Collection<EpisodeDocument>,
  seriesKey: string,
  mergeResult: MergeResult,
): Promise<EpisodeDocument> {
  // ... update to accept MergeResult
}
```

#### 3.5 Update `episodes.module.ts`
```typescript
@Module({
  imports: [
    LoggerModule,
    DatabaseModule,
    JikanModule,
    ExperimentModule,  // Add for feature flags
    // Future: ArmModule, SkyhookModule, TmdbModule, etc.
  ],
  controllers: [EpisodeController],
  injectables: [
    EpisodeService,
    EpisodesRepository,  // Make injectable
    EpisodesResolver,    // Add resolver
  ],
})
export class EpisodeModule {}
```

**Deliverable**: Follows project DI pattern, Repository and Resolver injectable, still Jikan-only behavior

---

### Phase 4: Aggregation Implementation 🎨
**Goal**: Implement full merge algorithm

#### 4.1 Implement `aggregator/merge.ts`
```typescript
export const mergeEpisodes = (
  ctx: MergeContext,
  slices: EpisodeSourceSlice[],
): MergeResult => {
  // 1. Select primary source (prefer ctx.preferRuntime, fallback to JIKAN)
  // 2. Index primary episodes by number
  // 3. For each secondary slice:
  //    a. Try direct number match
  //    b. Try air date proximity (±2 days)
  //    c. Try fuzzy title match (if threshold enabled)
  //    d. Mark as orphan if no match
  // 4. Track conflicts (title, duration, air date)
  // 5. Enrich fields per source priority
  // 6. Sort by alignment number
  return { episodes };
};
```

**Key Sub-algorithms:**
- `dice()`: Bigram Dice coefficient with memoization
- `norm()`: String normalization (lowercase, alphanumeric)
- `normTitle()`: Title normalization (prefer romanji > english > native)
- `toDay()`: Convert Instant to day bucket (for date proximity)
- `epNum()`: Extract alignment number (prefer number else id)

#### 4.2 Implement `helpers/sources.ts`
```typescript
// Jikan source (already implemented in loader.ts)
export function getJikanSlice(
  jikanService: JikanService,
  malId: number,
): Promise<EpisodeSourceSlice> {
  // Fetch + transform to canonical
  // Return { source: 'JIKAN', episodes }
}

// Stubs for future sources (return null initially)
export async function getSkyhookSliceAlignedToScope(opts): Promise<...> {
  // TODO: Implement when ready to enable Skyhook
  return { slice: null, remapped: 0 };
}

export async function getTmdbSliceForScope(opts): Promise<...> {
  // TODO: Implement when ready to enable TMDB
  return null;
}

// ... similar stubs for Trakt, Notify, Themes
```

#### 4.3 Implement `helpers/scope.ts`
```typescript
// Derive season/episode pairs by aligning Jikan to Skyhook structure
export function deriveSeasonScope(
  canonical: EpisodeCanonical[],
  skyhookShow: SkyhookShow | null,
  titleSimThreshold?: number,
): { pairs: SeasonEpisodePair[]; stats: ScopeStats } {
  // TODO: Implement scope derivation
  // For now, return empty pairs (no scope available)
  return { pairs: [], stats: { attempted: 0, exactMatches: 0, fuzzyMatches: 0 } };
}
```

#### 4.4 Implement `helpers/stats.ts`
```typescript
export function logMergeStats(
  episodes: MergedEpisode[],
  opts: { titleSim: number | null },
  xemRemapped: number,
): void {
  const sources = new Set(episodes.flatMap(e => e.sources));
  const conflicts = episodes.filter(e => e.conflictReasons?.length);
  
  logger.info('episodes.merge.stats', {
    total: episodes.length,
    sources: Array.from(sources),
    conflicts: conflicts.length,
    xemRemapped,
    titleSimThreshold: opts.titleSim,
  });
}
```

#### 4.5 Implement `helpers/xem.ts` (stub)
```typescript
// TheXem episode number normalization
export async function buildXemMaps(tvdbId: number): Promise<XemMaps> {
  // TODO: Implement XEM API integration
  return { seasonMap: null, absMap: null };
}

export function remapEpisodeNumber(
  num: number | null,
  season: number | null,
  episode: number | null,
  maps: XemMaps,
): { number: number | null; remapped: boolean } {
  // TODO: Apply XEM remapping
  return { number: num, remapped: false };
}
```

#### 4.6 Add Feature Flag Helpers
```typescript
// In src/common/experiment/helpers.ts (or similar)
export function getTitleSimThreshold(features: Features): number | undefined {
  return features.getFeatureValue('episode-align-title-sim');
}

export function isXemNormalizationEnabled(features: Features): boolean {
  return features.getFeatureValue('enable-xem-normalization') ?? false;
}
```

**Deliverable**: Full merge algorithm, still Jikan-only but ready for multi-source

---

### Phase 5: Multi-Source Enablement 🌐
**Goal**: Progressively enable additional sources

#### 5.1 Enable Skyhook (TVDB)
- Implement `getSkyhookSliceAlignedToScope()`
- Implement `deriveSeasonScope()`
- Add feature flag: `enable-skyhook-source`
- Test merge with Jikan + Skyhook

#### 5.2 Enable TMDB
- Implement `getTmdbSliceForScope()` and `getTmdbSliceByCanonical()`
- Add feature flag: `enable-tmdb-source`
- Test duration/image enrichment

#### 5.3 Enable Trakt
- Implement `getTraktSlice()`
- Add feature flag: `enable-trakt-source`

#### 5.4 Enable Notify
- Implement `getNotifyEpisodeSliceByCanonical()`
- Add feature flag: `enable-notify-source`

#### 5.5 Enable Themes
- Extend Jikan fetch to include themes
- Merge themes into canonical episodes
- Add feature flag: `enable-themes-enrichment`

**Deliverable**: Full multi-source aggregation with feature flag control

---

### Phase 6: Testing & Validation ✅
**Goal**: Ensure correctness and consistency

#### 6.1 Unit Tests
- `aggregator/merge.test.ts`: Test Dice coefficient, alignment, conflicts
- `collection/episode.collection.test.ts`: Test collection interface
- `helpers/sources.test.ts`: Test source slicing (with mocks)
- `helpers/scope.test.ts`: Test scope derivation

#### 6.2 Integration Tests
- `repository/episodes.repository.test.ts`: Update existing tests
- Test single-source merge (Jikan)
- Test multi-source merge (mocked slices)
- Test feature flag gating
- Test conflict detection

#### 6.3 E2E Tests
- `tests/episodes.e2e.test.ts`: Test full flow
- Verify API response shape unchanged
- Verify pagination consistency
- Verify cache behavior

**Deliverable**: Comprehensive test coverage

---

## Migration Risks & Mitigation

### Risk 1: Breaking API Changes
**Mitigation**: Maintain `EpisodesContainer` response shape
- Internal types change (`MergedEpisode`), but API response stays `EpisodeCanonical[]`
- Strip merge metadata before returning (unless diagnostics enabled)

### Risk 2: Performance Degradation
**Mitigation**: 
- Benchmark merge algorithm with large episode lists (>1000 episodes)
- Add performance marks around merge operations
- Monitor cache hit rates
- Consider async merge for very large datasets

### Risk 3: Data Quality Issues
**Mitigation**:
- Start with Jikan-only (existing behavior)
- Enable sources one at a time behind feature flags
- Monitor conflict rates in logs
- Implement rollback mechanism (disable feature flag)

### Risk 4: Cache Invalidation
**Mitigation**:
- Add version field to `EpisodeDocument`
- Invalidate cache when merge logic changes
- Adjust TTL based on merge complexity

### Risk 5: Dependency Availability
**Mitigation**:
- Graceful degradation (if TMDB fails, skip enrichment)
- Timeout secondary sources (don't block primary)
- Log source fetch failures without failing request

---

## Feature Flags Strategy

### Proposed Flags
```typescript
interface AppFeatures {
  // Existing
  'episode-align-title-sim'?: number;  // 0..1, undefined = disabled
  
  // New (for phased rollout)
  'enable-episode-merge-v2': boolean;  // Master toggle for new merge logic
  'enable-skyhook-source': boolean;    // Enable TVDB via Skyhook
  'enable-tmdb-source': boolean;       // Enable TMDB enrichment
  'enable-trakt-source': boolean;      // Enable Trakt enrichment
  'enable-notify-source': boolean;     // Enable Notify enrichment
  'enable-themes-enrichment': boolean; // Enable themes from Jikan
  'enable-xem-normalization': boolean; // Enable TheXem remapping
  'episode-merge-diagnostics': boolean;// Include merge stats in response
}
```

### Rollout Plan
1. **Week 1**: Deploy Phase 1-3 (structure only, no behavior change)
2. **Week 2**: Deploy Phase 4 with `enable-episode-merge-v2: false` (dark launch)
3. **Week 3**: Enable `enable-episode-merge-v2: true` for 10% of requests
4. **Week 4**: Ramp to 50% if metrics look good
5. **Week 5**: Ramp to 100%, monitor for issues
6. **Week 6+**: Enable secondary sources one at a time

---

## Success Metrics

### Functional Correctness
- ✅ No regressions in existing API tests
- ✅ Episode counts match Jikan baseline (±5% for merge alignment)
- ✅ Pagination cursors remain valid across filter changes
- ✅ Cache hit rates remain >80% for completed shows

### Performance
- ✅ p95 response time <500ms (same as current)
- ✅ p99 response time <1000ms
- ✅ Cache miss (cold fetch) <3000ms
- ✅ Memory usage <200MB per request

### Data Quality
- ✅ Conflict rate <10% of merged episodes
- ✅ Orphan rate <2% of secondary source episodes
- ✅ Duration enrichment >70% of episodes (when TMDB enabled)
- ✅ Image enrichment >60% of episodes (when TMDB enabled)

### Operational
- ✅ Zero downtime deployment
- ✅ Rollback capability (<5 minutes)
- ✅ Structured logs for debugging
- ✅ Merge statistics in monitoring dashboard

---

## Dependencies & Prerequisites

### Services Required
- ✅ JikanService (already available)
- ✅ ArmService (already available)
- ✅ SkyhookService (already available)
- ✅ TmdbService (already available)
- ✅ TraktService (already available)
- ✅ NotifyService (already available)
- ✅ ThemeService (already available)
- ✅ ThexemService (already available)
- ✅ ExperimentService (already available)

### Type System
- ✅ `@scope/common/types` - Need to add `Features` interface
- ✅ `@scope/common/experiment` - Need feature flag helper functions
- ✅ `@scope/service/arm` - `SeriesRelationId` type (already exists)

### Infrastructure
- ✅ MongoDB collection for episodes (already exists)
- ✅ GrowthBook for feature flags (already configured)
- ✅ OTEL for tracing (already instrumented)
- ✅ Structured logging (already in place)

---

## Open Questions & Decisions Needed

### 1. API Response Shape
**Question**: Should merge metadata be exposed in API responses?

**Option A**: Internal only (strip before returning)
```typescript
return {
  data: page.data.map(stripMergeMetadata),  // Return EpisodeCanonical[]
  ...pagination
};
```

**Option B**: Optional diagnostics (via query param)
```typescript
if (query.includeDiagnostics) {
  return {
    data: page.data,  // Return MergedEpisode[] with metadata
    diagnostics: { sources, conflicts, mergeStats },
    ...pagination
  };
}
```

**Recommendation**: Option B - useful for debugging and monitoring

---

### 2. Cache Strategy
**Question**: Should merged data have different TTL than Jikan-only?

**Current TTL**:
- Airing shows: 12 hours
- Completed shows: 7 days (168 hours)

**Options**:
- **A**: Keep same TTL (simpler, may serve stale secondary source data)
- **B**: Shorter TTL for multi-source (6h/3d - more API calls but fresher data)
- **C**: Per-source TTL tracking (complex, allows granular invalidation)

**Recommendation**: Start with **A**, move to **B** if data staleness becomes issue

---

### 3. Merge Conflict Resolution
**Question**: How to handle title conflicts when merging?

**Current Behavior**: Prefer primary (Jikan) title always

**Options**:
- **A**: Always prefer primary source (simple, consistent)
- **B**: Prefer longest/most detailed title (may be more accurate)
- **C**: Prefer TMDB title for English, Jikan for romanji/native (locale-aware)

**Recommendation**: **A** initially, **C** as future enhancement

---

### 4. Scope Derivation Strategy
**Question**: How to handle mismatched episode counts (Jikan vs Skyhook)?

**Example**: Jikan has 24 episodes, Skyhook (TVDB) has 25 (includes OVA as S01E25)

**Options**:
- **A**: Strict matching only (episodes must align perfectly)
- **B**: Fuzzy matching (align by title/date, allow count mismatch)
- **C**: Manual override mappings (maintain exception list)

**Recommendation**: **B** with conflict tracking, **C** for known problematic shows

---

### 5. XEM Normalization
**Question**: Should XEM remapping be enabled by default?

**Context**: TheXEM provides episode number corrections for known mismatches

**Options**:
- **A**: Enabled by default (better alignment, but adds API dependency)
- **B**: Disabled by default (simpler, enable via feature flag when needed)

**Recommendation**: **B** - start conservative, enable for specific shows with issues

---

### 6. Error Handling Strategy
**Question**: How to handle partial failures (e.g., TMDB times out)?

**Options**:
- **A**: Fail entire request (strict, but poor UX)
- **B**: Continue with available sources (graceful degradation)
- **C**: Return cached data on failure (stale but available)

**Recommendation**: **B** with logging, **C** for repeated failures

---

## Timeline Estimate

### Optimistic (Full-time, no blockers)
- **Phase 1**: 2 days (structural foundation)
- **Phase 2**: 1 day (type updates)
- **Phase 3**: 1 day (repository refactoring)
- **Phase 4**: 3 days (aggregation implementation)
- **Phase 5**: 5 days (multi-source enablement, 1 day per source)
- **Phase 6**: 2 days (testing & validation)
- **Total**: ~2 weeks

### Realistic (Part-time, with reviews/testing)
- **Phase 1**: 1 week
- **Phase 2**: 2 days
- **Phase 3**: 3 days
- **Phase 4**: 1 week
- **Phase 5**: 2 weeks (1-2 sources per week)
- **Phase 6**: 1 week
- **Total**: ~6 weeks

### Conservative (With production issues/pivots)
- Add 50% buffer to realistic timeline
- **Total**: ~9 weeks

---

## Next Steps & Decision Points

### Immediate Actions Required
1. **Review this document** - Confirm approach and scope
2. **Answer open questions** - Make decisions on API shape, cache strategy, etc.
3. **Choose starting phase** - Full implementation or proof of concept first?
4. **Set timeline** - Optimistic/realistic/conservative?

### Phase 1 Kickoff Checklist
- [ ] Create feature branch: `feature/episodes-aggregation-alignment`
- [ ] Set up test infrastructure (if needed)
- [ ] Review instruction files for episodes package
- [ ] Confirm service availability (Jikan, ARM, Skyhook, TMDB, etc.)
- [ ] Create Phase 1 tasks in project tracker

### Success Criteria for Phase 1
- [ ] New folder structure in place
- [ ] Collection interface defined and implemented
- [ ] Store types extracted
- [ ] Transformer reorganized
- [ ] All existing tests still pass
- [ ] No behavior changes (Jikan-only still works)

---

## References

### Source Code
- **Reference Implementation**: [AniTrend/on-the-edge/dev/src/episodes](https://github.com/AniTrend/on-the-edge/tree/dev/src/episodes)
- **Current Implementation**: `src/package/episodes/`

### Documentation
- [MongoDB Collection Interface Design](./mongodb-interface-design.md)
- [Service Layer Refactoring Contract](./service-layer-refactor-contract.md)
- [Test Infrastructure Setup](./test-infrastructure-setup.md)

### Related Issues/PRs
- [on-the-edge #259 - Project Restructure](https://github.com/AniTrend/on-the-edge/pull/259)
- [on-the-edge #268 - No Cross-Package Imports](https://github.com/AniTrend/on-the-edge/pull/268)

---

## Appendix A: File-by-File Change Summary

### New Files (10)
```
src/package/episodes/
├── aggregator/
│   ├── merge.ts                       [NEW] Core merge algorithm
│   └── types.ts                       [NEW] Merge context/result types
├── transformer/
│   └── canonical.ts                   [MOVED] From episodes.transformer.ts
└── repository/
    ├── episodes.resolver.ts           [NEW] Injectable multi-source orchestration
    └── helpers/
        ├── scope.ts                   [NEW] Pure function for season scope
        ├── sources.ts                 [NEW] Pure functions for source fetching
        ├── stats.ts                   [NEW] Pure function for merge stats
        └── xem.ts                     [NEW] Pure functions for XEM normalization
```

**Note:** No `collection/` or `store/` modules - follows existing project patterns

### Modified Files (7)
```
src/package/episodes/
├── episodes.schema.ts                 [MODIFIED] Add merge-related Zod schemas
├── episodes.types.ts                  [MODIFIED] Infer from schemas, add merge types
├── episodes.swagger.ts                [MODIFIED] Update OpenAPI specs
├── episodes.service.ts                [MODIFIED] Inject repository via DI (not create inline)
├── episodes.module.ts                 [MODIFIED] Add repository/resolver to injectables
├── repository/
│   ├── episodes.repository.ts         [MODIFIED] Make Injectable, inject resolver, create adapter inline
│   ├── episodes.document.ts           [MODIFIED] Update for MergedEpisode[]
│   └── helpers/
│       └── loader.ts                  [MODIFIED] Accept MergeResult in persist function
```

### Deleted Files (1)
```
src/package/episodes/
└── episodes.transformer.ts            [DELETED] Moved to transformer/canonical.ts
```

---

## Appendix B: Type Definitions Quick Reference

### Type Flow (Project Pattern)
```
episodes.schema.ts (Zod schemas - source of truth)
    ↓ z.infer
episodes.types.ts (TypeScript types)
    ↓ extends/augments
episodes.document.ts (MongoDB Document shape)
    ↓ .openapi extension
episodes.swagger.ts (OpenAPI specs)
```

### Core Schemas (Zod)
```typescript
// In episodes.schema.ts
EpisodeKindSchema = z.enum(['main', 'ova', 'ona', 'recap', 'filler', 'special']);
EpisodeTitleSchema = z.object({ english, romanji, native });
EpisodeThemesSchema = z.object({ openings: z.array(z.string()), endings: z.array(z.string()) });
EpisodeCanonicalSchema = z.object({ id, number, title, ..., themes });
SourceTypeSchema = z.enum(['JIKAN', 'SKYHOOK', 'TMDB', 'TRAKT', 'NOTIFY', 'THEMES']);
ConflictReasonSchema = z.enum(['TITLE', 'DURATION', 'AIR_DATE', 'ORPHAN']);
MergedEpisodeSchema = EpisodeCanonicalSchema.extend({ sources, conflictReasons, alignmentKey });
EpisodeQuerySchema = z.object({ malId, limit, after, before, kind, ... });
EpisodesContainerSchema = z.object({ data, next, previous, first, last, total });
```

### Inferred Types (TypeScript)
```typescript
// In episodes.types.ts (z.infer from schemas)
type EpisodeKind = z.infer<typeof EpisodeKindSchema>;
type EpisodeCanonical = z.infer<typeof EpisodeCanonicalSchema>;
type MergedEpisode = z.infer<typeof MergedEpisodeSchema>;
type SourceType = z.infer<typeof SourceTypeSchema>;
type ConflictReason = z.infer<typeof ConflictReasonSchema>;
```

### Document Types (MongoDB)
```typescript
// In episodes.document.ts
type EpisodeDocument = Document & {
  seriesKey: string;
  airing: boolean;
  updatedAt: Instant;
  episodes: MergedEpisode[];
};
```

### Swagger Specs (OpenAPI)
```typescript
// In episodes.swagger.ts
export const EpisodeSwagger = EpisodesContainerSchema.openapi({
  title: 'Episodes',
  description: 'Paginated episodes response',
});
```

---

## Appendix C: Merge Algorithm Pseudocode

```typescript
function mergeEpisodes(ctx: MergeContext, slices: EpisodeSourceSlice[]): MergeResult {
  // 1. Select primary source
  const primary = slices.find(s => s.source === ctx.preferRuntime) || slices.find(s => s.source === 'JIKAN') || slices[0];
  
  // 2. Index primary episodes
  const index = new Map<number, MergedEpisode>();
  for (const ep of primary.episodes) {
    index.set(ep.number, { ...ep, sources: [primary.source] });
  }
  
  // 3. Process secondary slices
  for (const slice of slices) {
    if (slice === primary) continue;
    
    for (const ep of slice.episodes) {
      let existing = index.get(ep.number);
      
      // 3a. Try alignment fallbacks if no direct match
      if (!existing) {
        // Try air date proximity
        existing = findByAirDate(index, ep.aired, tolerance = 2 days);
        
        // Try fuzzy title match
        if (!existing && ctx.titleSimThreshold) {
          existing = findByTitleSimilarity(index, ep.title, ctx.titleSimThreshold);
        }
        
        // Mark as orphan if still no match
        if (!existing) {
          index.set(ep.number, {
            ...ep,
            sources: [slice.source],
            conflictReasons: ['ORPHAN']
          });
          continue;
        }
      }
      
      // 3b. Merge into existing episode
      existing.sources.push(slice.source);
      
      // 3c. Detect conflicts
      if (ep.title !== existing.title) existing.conflictReasons.push('TITLE');
      if (Math.abs(ep.duration - existing.duration) > 2) existing.conflictReasons.push('DURATION');
      if (Math.abs(daysBetween(ep.aired, existing.aired)) > 2) existing.conflictReasons.push('AIR_DATE');
      
      // 3d. Enrich fields per source priority
      if (slice.source === 'TMDB') {
        // Overwrite runtime/images
        existing.duration = ep.duration;
        existing.poster = ep.poster;
      } else {
        // Only fill missing fields
        existing.duration ??= ep.duration;
        existing.poster ??= ep.poster;
      }
    }
  }
  
  // 4. Sort and return
  const episodes = Array.from(index.values()).sort((a, b) => a.number - b.number);
  return { episodes };
}
```

---

**Document Version**: 1.0  
**Last Updated**: 12 October 2025  
**Status**: 📋 Awaiting Review

**Ready to proceed?** Please review this document and let me know:
1. Any sections that need clarification
2. Decisions on open questions (Appendix)
3. Preferred implementation approach (full alignment vs. phased)
4. Timeline expectations

Once approved, we can begin implementation! 🚀
