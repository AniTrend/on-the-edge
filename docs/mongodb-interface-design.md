# MongoDB Repository Interface Design

**Date**: October 7, 2025  
**Status**: Design Specification  
**Related**: `service-audit.md`, `test-infrastructure-summary.md`

## Executive Summary

This document defines the persistence layer abstraction for the episodes and series modules. The design provides a clean separation between business logic and data storage, enabling both production MongoDB usage and fast in-memory testing.

### Key Design Principles

1. **Interface-Based Abstraction** - Repositories depend on interfaces, not concrete implementations
2. **Adapter Pattern** - Multiple implementations (MongoDB, in-memory) behind same interface
3. **Minimal Surface Area** - Only expose operations actually needed by repositories
4. **Type Safety** - Full TypeScript support with generics
5. **Test-Friendly** - In-memory adapter matches MongoDB behavior for deterministic tests

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│          Controllers                    │
│  (episodes.controller.ts)               │
│  (series.controller.ts)                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│          Services                       │
│  (episodes.service.ts)                  │
│  (series.service.ts)                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│        Repositories                     │
│  (episodes.repository.ts)               │
│  (series.repository.ts)                 │
│                                         │
│  Depends on: Collection<T>              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────┬──────────────┐
│   Collection Interface   │              │
└──────────────┬───────────┴──────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐  ┌─────────────────┐
│   MongoDB    │  │   InMemory      │
│   Adapter    │  │   Adapter       │
│ (Production) │  │   (Testing)     │
└──────────────┘  └─────────────────┘
```

---

## Core Interface: Collection<T>

### Design Philosophy

The `Collection<T>` interface mirrors the **minimal subset** of MongoDB's Collection API needed for episodes/series operations. It's **NOT** a complete MongoDB wrapper—only the methods actually used by repositories.

### Interface Definition

```typescript
// src/common/collection/collection.interface.ts

import type { Document, Filter, FindOptions, UpdateFilter } from 'mongodb';

/**
 * Document with MongoDB-style _id field
 */
export type WithId<T> = T & { _id: string };

/**
 * Options for findOneAndReplace operation
 */
export interface FindOneAndReplaceOptions {
  /**
   * If true, creates document if no match exists
   */
  upsert?: boolean;
  /**
   * Whether to return document before or after modification
   * @default 'after'
   */
  returnDocument?: 'before' | 'after';
}

/**
 * Options for updateOne operation
 */
export interface UpdateOneOptions {
  /**
   * If true, creates document if no match exists
   */
  upsert?: boolean;
}

/**
 * Result from updateOne operation
 */
export interface UpdateResult {
  acknowledged: boolean;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  upsertedId: string | null;
}

/**
 * Persistence abstraction for episodes and series data.
 * Provides a minimal interface matching MongoDB operations
 * used by repositories. Supports both MongoDB and in-memory
 * implementations for production and testing.
 *
 * Type parameter T extends Document to ensure _id compatibility.
 *
 * @example Production (MongoDB):
 * ```typescript
 * const mongoCollection = db.collection<EpisodeDocument>('episodes');
 * const collection = new MongoCollectionAdapter(mongoCollection);
 * const repo = new EpisodesRepository(collection, features);
 * ```
 *
 * @example Testing (In-Memory):
 * ```typescript
 * const collection = new InMemoryCollection<EpisodeDocument>();
 * const repo = new EpisodesRepository(collection, features);
 * ```
 */
export interface Collection<T extends Document> {
  /**
   * Find a single document matching the filter.
   * Returns null if no document matches.
   *
   * @param filter - MongoDB query filter
   * @param options - Find options (projection, sort, etc.)
   * @returns Matching document or null
   *
   * @example
   * ```typescript
   * const doc = await collection.findOne(
   *   { seriesKey: '123' },
   *   { projection: { updatedAt: 1 } }
   * );
   * ```
   */
  findOne(
    filter: Filter<T>,
    options?: FindOptions,
  ): Promise<WithId<T> | null>;

  /**
   * Find and replace a document atomically.
   * If upsert=true and no match, inserts the replacement.
   * Returns the document after replacement by default.
   *
   * @param filter - MongoDB query filter
   * @param replacement - Complete replacement document
   * @param options - Upsert and return options
   * @returns Updated/inserted document or null
   *
   * @example Upsert pattern:
   * ```typescript
   * const doc = await collection.findOneAndReplace(
   *   { seriesKey: '123' },
   *   { seriesKey: '123', episodes: [...], updatedAt: now },
   *   { upsert: true, returnDocument: 'after' }
   * );
   * ```
   */
  findOneAndReplace(
    filter: Filter<T>,
    replacement: T,
    options: FindOneAndReplaceOptions,
  ): Promise<WithId<T> | null>;

  /**
   * Update a document using MongoDB update operators.
   * Supports $set, $unset, $inc, etc.
   * If upsert=true and no match, creates new document.
   *
   * @param filter - MongoDB query filter
   * @param update - MongoDB update document (with operators)
   * @param options - Upsert options
   * @returns Update result with counts
   *
   * @example Update with $set:
   * ```typescript
   * await collection.updateOne(
   *   { seriesKey: '123' },
   *   { $set: { updatedAt: now, airing: false } },
   *   { upsert: false }
   * );
   * ```
   */
  updateOne(
    filter: Filter<T>,
    update: UpdateFilter<T>,
    options?: UpdateOneOptions,
  ): Promise<UpdateResult>;
}
```

### Key Design Decisions

#### 1. Why Only Three Methods?

**Analysis of on-the-edge repository patterns:**

```typescript
// EpisodeLocalSource (on-the-edge)
class EpisodeLocalSource {
  async get(seriesKey: string) {
    return await this.collection.findOne({ seriesKey });  // ✅ findOne
  }

  async save(doc: EpisodeDocument) {
    return await this.collection.findOneAndReplace(  // ✅ findOneAndReplace
      { seriesKey: doc.seriesKey },
      doc,
      { upsert: true, returnDocument: 'after' }
    );
  }

  async lastUpdated(seriesKey: string) {
    return await this.collection.findOne(  // ✅ findOne (with projection)
      { seriesKey },
      { projection: { updatedAt: 1 } }
    );
  }
}

// SeriesLocalSource (on-the-edge)
class SeriesLocalSource {
  async getById(id: number) {
    return await this.collection.findOne({ anilist: id });  // ✅ findOne
  }

  async save(media: MediaEntity) {
    return await this.collection.findOneAndReplace(  // ✅ findOneAndReplace
      { 'mediaId.anilist': media.mediaId.anilist },
      media,
      { upsert: true, returnDocument: 'after' }
    );
  }

  async getIds(id: number) {
    const doc = await this.collection.findOne({ anilist: id });  // ✅ findOne
    return doc?.ids ?? null;
  }
}
```

**Conclusion**: Both modules use only:
- `findOne()` - Read operations with optional projection
- `findOneAndReplace()` - Upsert pattern (atomic read-modify-write)
- `updateOne()` - Partial updates (e.g., TTL updates)

#### 2. Why Not `insertOne()` or `insertMany()`?

Repositories use **upsert pattern** via `findOneAndReplace()`:
- Simpler logic (no "exists check" needed)
- Atomic operation (race-condition safe)
- Single code path for create/update

#### 3. Why `WithId<T>` Type?

MongoDB returns documents with `_id` field, but TypeScript doesn't know this at compile time. `WithId<T>` makes this explicit:

```typescript
interface EpisodeDocument extends Document {
  seriesKey: string;
  episodes: EpisodeCanonical[];
  updatedAt: number;
  // Note: _id NOT declared here
}

// After retrieval from MongoDB/Collection:
const doc: WithId<EpisodeDocument> = await collection.findOne({ seriesKey: '123' });
console.log(doc._id);  // ✅ TypeScript knows _id exists
```

---

## Document Types

### Episodes Module

```typescript
// src/packages/episodes/episodes.types.ts

import type { Document } from 'mongodb';

/**
 * Storage representation for episodes of a series.
 * Cached in MongoDB with TTL based on airing status.
 */
export interface EpisodeDocument extends Document {
  /**
   * Canonical series identifier (typically MAL ID as string)
   * Used as primary lookup key.
   */
  seriesKey: string;

  /**
   * Whether series is currently airing (affects cache TTL).
   * - true: refresh every 12 hours
   * - false: refresh every 7 days
   * - null: unknown status
   */
  airing: boolean | null;

  /**
   * Last update timestamp (epoch seconds).
   * Used for TTL calculations.
   */
  updatedAt: number;

  /**
   * Merged episode list from all sources.
   * Ordered by episode number.
   */
  episodes: EpisodeCanonical[];

  /**
   * Optional: Sources that contributed to merge
   * (for debugging/analytics)
   */
  sources?: Array<'JIKAN' | 'SKYHOOK' | 'TMDB' | 'TRAKT' | 'NOTIFY' | 'THEMES'>;
}
```

### Series Module

```typescript
// src/packages/series/series.types.ts

import type { Document } from 'mongodb';

/**
 * Storage representation for series metadata.
 * Cached in MongoDB with TTL logic.
 */
export interface SeriesDocument extends Document {
  /**
   * AniList ID (primary identifier)
   */
  anilist: number;

  /**
   * Series metadata from multiple providers
   */
  mediaId: {
    anilist: number;
    myanimelist?: number;
    thetvdb?: number;
    themoviedb?: number;
    // ... other service IDs
  };

  /**
   * Title in various forms
   */
  title: {
    english?: string | null;
    native?: string | null;
    romanji?: string | null;
  };

  /**
   * Series type classification
   */
  type: 'ANIME' | 'MANGA' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA';

  /**
   * Air date information
   */
  startDate?: { year?: number; month?: number; day?: number };
  endDate?: { year?: number; month?: number; day?: number };

  /**
   * Episode count
   */
  episodes?: number | null;

  /**
   * Last update timestamp (epoch seconds)
   */
  updatedAt: number;

  // ... additional fields from multi-source merge
}
```

---

## Adapter Implementations

### 1. MongoDB Adapter (Production)

```typescript
// src/common/collection/mongo-collection.adapter.ts

import type {
  Collection as MongoCollection,
  Document,
  Filter,
  FindOptions,
  UpdateFilter,
} from 'mongodb';
import type {
  Collection,
  FindOneAndReplaceOptions,
  UpdateOneOptions,
  UpdateResult,
  WithId,
} from './collection.interface.ts';

/**
 * Production adapter wrapping MongoDB driver's Collection.
 * Implements Collection<T> interface by delegating to real MongoDB.
 *
 * @example
 * ```typescript
 * import { MongoClient } from 'mongodb';
 *
 * const client = new MongoClient(mongoUrl);
 * await client.connect();
 * const db = client.db('anitrend');
 * const mongoCollection = db.collection<EpisodeDocument>('episodes');
 *
 * const collection = new MongoCollectionAdapter(mongoCollection);
 * const repo = new EpisodesRepository(collection, features);
 * ```
 */
export class MongoCollectionAdapter<T extends Document>
  implements Collection<T> {
  constructor(
    private readonly mongoCollection: MongoCollection<T>,
  ) {}

  async findOne(
    filter: Filter<T>,
    options?: FindOptions,
  ): Promise<WithId<T> | null> {
    const result = await this.mongoCollection.findOne(filter, options);
    return result as WithId<T> | null;
  }

  async findOneAndReplace(
    filter: Filter<T>,
    replacement: T,
    options: FindOneAndReplaceOptions,
  ): Promise<WithId<T> | null> {
    const result = await this.mongoCollection.findOneAndReplace(
      filter,
      replacement,
      {
        upsert: options.upsert,
        returnDocument: options.returnDocument ?? 'after',
      },
    );
    return result as WithId<T> | null;
  }

  async updateOne(
    filter: Filter<T>,
    update: UpdateFilter<T>,
    options?: UpdateOneOptions,
  ): Promise<UpdateResult> {
    const result = await this.mongoCollection.updateOne(filter, update, {
      upsert: options?.upsert,
    });

    return {
      acknowledged: result.acknowledged,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
      upsertedId: result.upsertedId?.toString() ?? null,
    };
  }
}
```

**Key Points**:
- ✅ Thin wrapper (minimal logic)
- ✅ Type-safe delegation
- ✅ Converts MongoDB types to interface types
- ✅ Production-ready error handling (MongoDB driver handles)

### 2. In-Memory Adapter (Testing)

**Already Implemented**: `src/common/testing/memory-collection.ts`

The existing `InMemoryCollection<T>` class already implements all needed methods:
- ✅ `findOne(filter, options)` with projection support
- ✅ `findOneAndReplace(filter, replacement, options)` with upsert
- ✅ `updateOne(filter, update, options)` with upsert and `$set`
- ✅ Supports filter matching, sorting, comparison operators
- ✅ Generates unique `_id` fields automatically

**Current Implementation Status**: ✅ **Ready to use as-is**

**Minor Enhancement Needed**:
```typescript
// Ensure it implements Collection<T> interface explicitly
export class InMemoryCollection<T extends Document>
  implements Collection<T> {  // ✅ Add explicit interface implementation
  // ... existing implementation
}
```

---

## Repository Pattern

### Episodes Repository

```typescript
// src/packages/episodes/repository/episodes.repository.ts

import type { Collection } from '@scope/collection';
import type { Features } from '@scope/features';
import type { EpisodeDocument } from '../episodes.types.ts';

/**
 * Repository for episodes data with multi-source merging,
 * caching, and cursor-based pagination.
 *
 * Depends on:
 * - Collection<EpisodeDocument> for persistence
 * - Features for feature flag gating
 */
export class EpisodesRepository {
  constructor(
    private readonly collection: Collection<EpisodeDocument>,
    private readonly features: Features,
  ) {}

  /**
   * Get paginated episodes for a series.
   * Fetches from cache or remote, merges multiple sources,
   * applies filters, and returns paginated result.
   */
  async invoke(
    id: number,
    opts: {
      after?: EpisodeCursor;
      before?: EpisodeCursor;
      limit: number;
      filters?: EpisodeFilters;
      relation?: SeriesRelationId;
    },
  ): Promise<EpisodesDataResponse> {
    const seriesKey = String(id);

    // 1. Try cache
    const cached = await this.loadFromCache(seriesKey);
    if (cached) {
      return this.paginateAndFilter(cached, opts);
    }

    // 2. Fetch canonical (Jikan)
    const { airing, episodes: canonicalEpisodes } = await this.fetchCanonical(id);

    // 3. Optionally merge other sources (feature flags)
    const mergedEpisodes = await this.mergeMultiSource(
      canonicalEpisodes,
      opts.relation,
    );

    // 4. Persist merged result
    const document = await this.persist(seriesKey, airing, mergedEpisodes);

    // 5. Paginate and return
    return this.paginateAndFilter(document, opts);
  }

  /**
   * Load document from cache if fresh enough
   */
  private async loadFromCache(
    seriesKey: string,
  ): Promise<EpisodeDocument | null> {
    const doc = await this.collection.findOne({ seriesKey });

    if (!doc) return null;

    // TTL check
    const ttlHours = doc.airing ? 12 : 24 * 7;  // 12h or 7 days
    const ageHours = (Date.now() - doc.updatedAt * 1000) / (1000 * 3600);

    return ageHours < ttlHours ? doc : null;
  }

  /**
   * Persist merged episodes to cache
   */
  private async persist(
    seriesKey: string,
    airing: boolean | null,
    episodes: EpisodeCanonical[],
  ): Promise<EpisodeDocument> {
    const doc: EpisodeDocument = {
      seriesKey,
      airing,
      updatedAt: Math.floor(Date.now() / 1000),
      episodes,
    };

    const result = await this.collection.findOneAndReplace(
      { seriesKey },
      doc,
      { upsert: true, returnDocument: 'after' },
    );

    if (!result) {
      throw new Error(`Failed to persist episodes for ${seriesKey}`);
    }

    return result;
  }

  // ... other helper methods
}
```

### Series Repository

```typescript
// src/packages/series/repository/series.repository.ts

import type { Collection } from '@scope/collection';
import type { SeriesDocument } from './series.document.ts';

/**
 * Repository for series metadata with multi-source aggregation.
 *
 * Depends on:
 * - Collection<SeriesDocument> for persistence
 */
export class SeriesRepository {
  constructor(
    private readonly collection: Collection<SeriesDocument>,
  ) {}

  /**
   * Get series metadata by AniList ID.
   * Fetches from cache or aggregates from multiple providers.
   */
  async getById(id: number): Promise<SeriesDocument | null> {
    // 1. Try cache
    const cached = await this.collection.findOne({ anilist: id });

    if (cached) {
      // Check TTL (series metadata less volatile than episodes)
      const ageHours = (Date.now() - cached.updatedAt * 1000) / (1000 * 3600);
      if (ageHours < 24 * 7) {  // 7 days
        return cached;
      }
    }

    // 2. Fetch from multiple providers
    const aggregated = await this.aggregateFromProviders(id);

    // 3. Persist
    await this.collection.findOneAndReplace(
      { anilist: id },
      aggregated,
      { upsert: true, returnDocument: 'after' },
    );

    return aggregated;
  }

  /**
   * Get service IDs for a series (for episodes repository)
   */
  async getServiceIds(id: number): Promise<SeriesRelationId | null> {
    const doc = await this.collection.findOne(
      { anilist: id },
      { projection: { mediaId: 1 } },  // Only fetch IDs
    );

    return doc?.mediaId ?? null;
  }

  // ... other methods
}
```

---

## Dependency Injection (Danet)

### Module Setup

```typescript
// src/packages/episodes/episodes.module.ts

import { Module } from '@danet/core';
import { EpisodesController } from './episodes.controller.ts';
import { EpisodesService } from './episodes.service.ts';
import { EpisodesRepository } from './repository/episodes.repository.ts';
import { EpisodeCollectionProvider } from './episodes.providers.ts';

@Module({
  controllers: [EpisodesController],
  injectables: [
    EpisodesService,
    EpisodesRepository,
    EpisodeCollectionProvider,  // Factory provider
  ],
})
export class EpisodesModule {}
```

### Collection Provider (Factory Pattern)

```typescript
// src/packages/episodes/episodes.providers.ts

import { Injectable } from '@danet/core';
import { MongoClient } from 'mongodb';
import { SecretService } from '@scope/secret';
import { MongoCollectionAdapter } from '@scope/collection';
import type { Collection } from '@scope/collection';
import type { EpisodeDocument } from './episodes.types.ts';

/**
 * Factory provider for EpisodeDocument collection.
 * Injects MongoDB connection and wraps in adapter.
 */
@Injectable()
export class EpisodeCollectionProvider {
  private collection: Collection<EpisodeDocument> | null = null;

  constructor(
    private readonly secrets: SecretService,
  ) {}

  /**
   * Get or create collection instance
   */
  async getCollection(): Promise<Collection<EpisodeDocument>> {
    if (this.collection) {
      return this.collection;
    }

    // Connect to MongoDB
    const mongoUrl = this.secrets.get<string>('MONGO_URL');
    const client = new MongoClient(mongoUrl);
    await client.connect();

    const db = client.db('anitrend');
    const mongoCollection = db.collection<EpisodeDocument>('episodes');

    // Wrap in adapter
    this.collection = new MongoCollectionAdapter(mongoCollection);

    return this.collection;
  }
}
```

### Repository Injection

```typescript
// src/packages/episodes/repository/episodes.repository.ts

import { Injectable } from '@danet/core';
import type { Collection } from '@scope/collection';
import type { Features } from '@scope/features';
import type { EpisodeDocument } from '../episodes.types.ts';
import { EpisodeCollectionProvider } from '../episodes.providers.ts';
import { FeaturesService } from '@scope/features';

@Injectable()
export class EpisodesRepository {
  private collection: Collection<EpisodeDocument>;

  constructor(
    private readonly collectionProvider: EpisodeCollectionProvider,
    private readonly features: FeaturesService,
  ) {
    // Initialize collection asynchronously
    this.collectionProvider.getCollection().then((col) => {
      this.collection = col;
    });
  }

  // ... repository methods
}
```

---

## Testing Strategy

### Unit Test Pattern (In-Memory Collection)

```typescript
// src/packages/episodes/repository/episodes.repository.test.ts

import { describe, it, beforeEach, afterEach } from '@std/testing/bdd';
import { assertEquals, assert } from '@std/assert';
import { InMemoryCollection } from '@scope/testing';
import { EpisodesRepository } from './episodes.repository.ts';
import { createFeatureStub } from '@scope/testing';
import type { EpisodeDocument } from '../episodes.types.ts';

describe('EpisodesRepository', () => {
  let collection: InMemoryCollection<EpisodeDocument>;
  let repository: EpisodesRepository;
  let features: Features;

  beforeEach(() => {
    // Use in-memory collection for fast, isolated tests
    collection = new InMemoryCollection<EpisodeDocument>();

    // Stub features (all flags OFF by default)
    features = createFeatureStub({});

    // Create repository with test dependencies
    repository = new EpisodesRepository(collection, features);
  });

  afterEach(() => {
    collection.clear();
  });

  it('should cache and return episodes', async () => {
    // Seed cache
    await collection.findOneAndReplace(
      { seriesKey: '123' },
      {
        seriesKey: '123',
        airing: false,
        updatedAt: Math.floor(Date.now() / 1000),
        episodes: [
          { id: 1, number: 1, title: { english: 'Ep 1' } },
          { id: 2, number: 2, title: { english: 'Ep 2' } },
        ],
      } as EpisodeDocument,
      { upsert: true },
    );

    const result = await repository.invoke(123, { limit: 10 });

    assertEquals(result.data.length, 2);
    assertEquals(result.total, 2);
  });

  it('should paginate with cursor', async () => {
    // Seed large dataset
    const episodes = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      number: i + 1,
      title: { english: `Episode ${i + 1}` },
    }));

    await collection.findOneAndReplace(
      { seriesKey: '456' },
      {
        seriesKey: '456',
        airing: true,
        updatedAt: Math.floor(Date.now() / 1000),
        episodes,
      } as EpisodeDocument,
      { upsert: true },
    );

    // Get first page
    const page1 = await repository.invoke(456, { limit: 10 });
    assertEquals(page1.data.length, 10);
    assert(page1.last);  // Cursor exists

    // Get second page
    const page2 = await repository.invoke(456, {
      limit: 10,
      after: page1.last,
    });
    assertEquals(page2.data.length, 10);
    assertEquals(page2.data[0].id, 11);  // Continues from page 1
  });
});
```

### Integration Test Pattern (Real MongoDB)

```typescript
// src/packages/episodes/spec/episodes.integration.test.ts

import { describe, it, beforeAll, afterAll } from '@std/testing/bdd';
import { MongoClient } from 'mongodb';
import { MongoCollectionAdapter } from '@scope/collection';
import { EpisodesRepository } from '../repository/episodes.repository.ts';

describe('EpisodesRepository (Integration)', () => {
  let client: MongoClient;
  let repository: EpisodesRepository;

  beforeAll(async () => {
    // Connect to test MongoDB instance
    client = new MongoClient('mongodb://localhost:27017');
    await client.connect();

    const db = client.db('anitrend-test');
    const mongoCollection = db.collection<EpisodeDocument>('episodes');

    // Use real MongoDB adapter
    const collection = new MongoCollectionAdapter(mongoCollection);
    const features = createFeatureStub({});

    repository = new EpisodesRepository(collection, features);
  });

  afterAll(async () => {
    await client.close();
  });

  it('should persist to real MongoDB', async () => {
    // Test with actual database operations
    // ...
  });
});
```

---

## Migration Path

### Phase 1: Core Infrastructure (Current Task)

1. ✅ **Create `Collection<T>` interface**
   - File: `src/common/collection/collection.interface.ts`
   - Define interface with 3 methods + types

2. ✅ **Create MongoDB adapter**
   - File: `src/common/collection/mongo-collection.adapter.ts`
   - Wrap MongoDB driver's Collection

3. ✅ **Update InMemoryCollection**
   - File: `src/common/testing/memory-collection.ts`
   - Add explicit `implements Collection<T>`
   - Export from `@scope/collection` for cross-module use

4. ✅ **Create barrel exports**
   - File: `src/common/collection/index.ts`
   - Export interface, types, and MongoDB adapter
   - File: `src/common/testing/index.ts`
   - Export InMemoryCollection

5. ✅ **Update workspace config**
   - File: `deno.json`
   - Add `@scope/collection` import path

### Phase 2: Episodes Module (Next)

6. ⏳ **Define document types**
   - File: `src/packages/episodes/episodes.types.ts`
   - Add `EpisodeDocument` interface

7. ⏳ **Create collection provider**
   - File: `src/packages/episodes/episodes.providers.ts`
   - Factory for MongoDB collection

8. ⏳ **Implement repository**
   - File: `src/packages/episodes/repository/episodes.repository.ts`
   - Use `Collection<EpisodeDocument>` abstraction

9. ⏳ **Write tests**
   - Use `InMemoryCollection` for unit tests
   - Test caching, pagination, filtering

### Phase 3: Series Module

10. ⏳ **Define document types**
11. ⏳ **Create collection provider**
12. ⏳ **Implement repository**
13. ⏳ **Write tests**

---

## Performance Considerations

### MongoDB Indexes

```typescript
// Database migration/setup script

// Episodes collection indexes
await db.collection('episodes').createIndexes([
  { key: { seriesKey: 1 }, unique: true },  // Primary lookup
  { key: { updatedAt: 1 } },  // TTL queries
  { key: { airing: 1, updatedAt: 1 } },  // Compound for refresh logic
]);

// Series collection indexes
await db.collection('series').createIndexes([
  { key: { anilist: 1 }, unique: true },  // Primary lookup
  { key: { 'mediaId.myanimelist': 1 } },  // Alternate ID lookup
  { key: { updatedAt: 1 } },  // TTL queries
]);
```

### Caching Strategy

```typescript
/**
 * TTL Rules:
 * - Airing series: 12 hours (frequently updating)
 * - Completed series: 7 days (stable data)
 * - Series metadata: 7 days (less volatile)
 */
```

---

## Security & Error Handling

### Connection Management

```typescript
// Production: Use connection pooling
const client = new MongoClient(mongoUrl, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### Error Handling Pattern

```typescript
// Repository should catch and handle MongoDB errors
try {
  const result = await this.collection.findOneAndReplace(...);
  return result;
} catch (error) {
  this.logger.error('Failed to persist episodes', {
    seriesKey,
    error: error instanceof Error ? error.message : String(error),
  });
  throw new Error(`Persistence failure for series ${seriesKey}`);
}
```

---

## Summary

### Design Highlights

1. **Minimal Interface** - Only 3 methods needed for entire migration
2. **Type-Safe** - Full TypeScript with generics and explicit return types
3. **Test-Friendly** - In-memory adapter matches MongoDB behavior
4. **Production-Ready** - MongoDB adapter is thin wrapper over official driver
5. **DI-Compatible** - Works with Danet's dependency injection
6. **Flexible** - Can add more methods later without breaking existing code

### Next Steps

1. ✅ Create `Collection<T>` interface
2. ✅ Create MongoDB adapter
3. ✅ Update InMemoryCollection
4. ✅ Export from workspace aliases
5. ⏳ **Proceed to Task 3: Align type system with on-the-edge**

---

## References

- **On-the-edge patterns**: 
  - `src/episodes/collection/episode.collection.ts`
  - `src/series/local/series.local.source.ts`
- **Existing infrastructure**:
  - `src/common/testing/memory-collection.ts`
  - `docs/test-infrastructure-summary.md`
- **MongoDB driver docs**: https://www.mongodb.com/docs/drivers/node/current/
