# Test Infrastructure Setup Guide

> **Note**: This is the original implementation guide. Phase 5 (Mock Fetch Helpers) has been refactored to use generic helpers. See `test-infrastructure-summary.md` for current implementation and patterns.

## Overview

This document provides step-by-step instructions for setting up the testing infrastructure required for the episodes and series migration. This foundation **must be completed first** before any migration work begins.

## Goals

- Create reusable testing utilities for all migration work
- Establish patterns for mocking external services
- Build in-memory adapters for MongoDB operations
- Define test data builders with fluent APIs
- Enable fast, isolated, deterministic tests

## Prerequisites

- Deno installed and configured
- Access to the sample-danet repository
- Familiarity with `@c4spar/mock-fetch`, `@scope/client` and `@std/testing`
- Understanding of the repository testing conventions (see `AGENTS.md`)

---

## Implementation Plan

### Phase 1: In-Memory Collection Adapter

#### 1.1 Create Directory Structure
```bash
mkdir -p src/common/testing
```

#### 1.2 Implement In-Memory Collection
**File**: `src/common/testing/memory-collection.ts`

```typescript
import type {
  Collection,
  Document,
  Filter,
  FindOptions,
  InsertManyResult,
  UpdateFilter,
  UpdateResult,
  WithId,
} from 'mongodb';

/**
 * In-memory collection adapter for testing MongoDB operations.
 * Provides a simplified implementation of MongoDB Collection interface
 * suitable for unit and integration tests.
 * 
 * @example
 * ```typescript
 * const collection = new InMemoryCollection<MyDocument>();
 * await collection.insertMany([{ name: 'test' }]);
 * const doc = await collection.findOne({ name: 'test' });
 * ```
 */
export class InMemoryCollection<T extends Document> {
  private data: Map<string, WithId<T>> = new Map();
  private idCounter = 1;

  /**
   * Generate a unique ID for documents
   */
  private generateId(): string {
    return `generated-id-${this.idCounter++}`;
  }

  /**
   * Simple filter matching - handles basic equality checks
   */
  private matchesFilter(doc: WithId<T>, filter: Filter<T>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      // Handle special operators
      if (key.startsWith('$')) {
        // Add support for $and, $or, etc. as needed
        continue;
      }

      // Handle nested path matching (e.g., 'seriesKey')
      const docValue = (doc as any)[key];
      
      if (typeof value === 'object' && value !== null) {
        // Handle comparison operators like $lt, $gt, $gte, $lte, $exists
        if ('$lt' in value && docValue >= value.$lt) return false;
        if ('$gt' in value && docValue <= value.$gt) return false;
        if ('$lte' in value && docValue > value.$lte) return false;
        if ('$gte' in value && docValue < value.$gte) return false;
        if ('$exists' in value && (docValue !== undefined) !== value.$exists) {
          return false;
        }
      } else {
        // Simple equality check
        if (docValue !== value) return false;
      }
    }
    return true;
  }

  /**
   * Apply sorting to results
   */
  private applySort(
    docs: WithId<T>[],
    sort?: { [key: string]: 1 | -1 | 'asc' | 'desc' },
  ): WithId<T>[] {
    if (!sort) return docs;

    return docs.sort((a, b) => {
      for (const [field, direction] of Object.entries(sort)) {
        const aVal = (a as any)[field];
        const bVal = (b as any)[field];
        
        const ascending = direction === 1 || direction === 'asc';
        
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * Find a single document matching the filter
   */
  async findOne(
    filter: Filter<T>,
    options?: FindOptions,
  ): Promise<WithId<T> | null> {
    const matches = Array.from(this.data.values())
      .filter((doc) => this.matchesFilter(doc, filter));

    if (matches.length === 0) return null;

    const sorted = this.applySort(matches, options?.sort as any);
    return sorted[0];
  }

  /**
   * Find multiple documents matching the filter
   */
  find(filter: Filter<T> = {}, options?: FindOptions): {
    toArray(): Promise<WithId<T>[]>;
    limit(count: number): this;
    sort(spec: { [key: string]: 1 | -1 }): this;
  } {
    let matches = Array.from(this.data.values())
      .filter((doc) => this.matchesFilter(doc, filter));

    let limitCount: number | undefined;
    let sortSpec: { [key: string]: 1 | -1 } | undefined;

    const result = {
      limit(count: number) {
        limitCount = count;
        return result;
      },
      sort(spec: { [key: string]: 1 | -1 }) {
        sortSpec = spec;
        return result;
      },
      async toArray() {
        let results = matches;
        
        if (sortSpec) {
          results = this.applySort(results, sortSpec);
        }
        
        if (limitCount !== undefined) {
          results = results.slice(0, limitCount);
        }
        
        return results;
      },
    };

    return result;
  }

  /**
   * Insert multiple documents
   */
  async insertMany(docs: T[]): Promise<InsertManyResult> {
    const insertedIds: { [key: number]: string } = {};
    const insertedCount = docs.length;

    docs.forEach((doc, index) => {
      const id = this.generateId();
      const withId = { ...doc, _id: id } as WithId<T>;
      this.data.set(id, withId);
      insertedIds[index] = id;
    });

    return {
      acknowledged: true,
      insertedCount,
      insertedIds,
    } as InsertManyResult;
  }

  /**
   * Insert a single document
   */
  async insertOne(doc: T): Promise<{ insertedId: string }> {
    const id = this.generateId();
    const withId = { ...doc, _id: id } as WithId<T>;
    this.data.set(id, withId);
    return { insertedId: id };
  }

  /**
   * Update a single document matching the filter
   */
  async updateOne(
    filter: Filter<T>,
    update: UpdateFilter<T>,
    options?: { upsert?: boolean },
  ): Promise<UpdateResult> {
    const doc = await this.findOne(filter);

    if (!doc && options?.upsert) {
      // Upsert: create new document
      const newDoc = { ...(filter as any), ...(update.$set || {}) };
      await this.insertOne(newDoc);
      return {
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 1,
        upsertedId: this.generateId(),
      } as UpdateResult;
    }

    if (!doc) {
      return {
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 0,
        upsertedId: null,
      } as UpdateResult;
    }

    // Apply $set operator
    if (update.$set) {
      Object.assign(doc, update.$set);
    }

    return {
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
      upsertedCount: 0,
      upsertedId: null,
    } as UpdateResult;
  }

  /**
   * Replace a document or insert if it doesn't exist
   */
  async findOneAndReplace(
    filter: Filter<T>,
    replacement: T,
    options?: { upsert?: boolean },
  ): Promise<WithId<T> | null> {
    const existing = await this.findOne(filter);

    if (!existing && options?.upsert) {
      const id = this.generateId();
      const withId = { ...replacement, _id: id } as WithId<T>;
      this.data.set(id, withId);
      return withId;
    }

    if (existing) {
      const updated = { ...replacement, _id: existing._id } as WithId<T>;
      this.data.set(existing._id as string, updated);
      return updated;
    }

    return null;
  }

  /**
   * Clear all data from the collection
   */
  clear(): void {
    this.data.clear();
    this.idCounter = 1;
  }

  /**
   * Get count of documents matching filter
   */
  async countDocuments(filter: Filter<T> = {}): Promise<number> {
    return Array.from(this.data.values())
      .filter((doc) => this.matchesFilter(doc, filter))
      .length;
  }
}
```

#### 1.3 Create Tests for In-Memory Collection
**File**: `src/database/testing/memory-collection.test.ts`

```typescript
import { describe, it } from '@std/testing/bdd';
import { assertEquals, assert } from '@std/assert';
import { InMemoryCollection } from './memory-collection.ts';

interface TestDoc {
  name: string;
  value: number;
  category?: string;
}

describe('InMemoryCollection', () => {
  describe('insertMany and findOne', () => {
    it('should insert and retrieve documents', async () => {
      const collection = new InMemoryCollection<TestDoc>();
      
      await collection.insertMany([
        { name: 'doc1', value: 100 },
        { name: 'doc2', value: 200 },
      ]);

      const doc = await collection.findOne({ name: 'doc1' });
      assert(doc);
      assertEquals(doc.name, 'doc1');
      assertEquals(doc.value, 100);
    });

    it('should return null when document not found', async () => {
      const collection = new InMemoryCollection<TestDoc>();
      const doc = await collection.findOne({ name: 'nonexistent' });
      assertEquals(doc, null);
    });
  });

  describe('find with sorting and limiting', () => {
    it('should support sorting', async () => {
      const collection = new InMemoryCollection<TestDoc>();
      
      await collection.insertMany([
        { name: 'b', value: 2 },
        { name: 'a', value: 1 },
        { name: 'c', value: 3 },
      ]);

      const docs = await collection
        .find()
        .sort({ value: 1 })
        .toArray();

      assertEquals(docs[0].value, 1);
      assertEquals(docs[1].value, 2);
      assertEquals(docs[2].value, 3);
    });

    it('should support limiting', async () => {
      const collection = new InMemoryCollection<TestDoc>();
      
      await collection.insertMany([
        { name: 'a', value: 1 },
        { name: 'b', value: 2 },
        { name: 'c', value: 3 },
      ]);

      const docs = await collection.find().limit(2).toArray();
      assertEquals(docs.length, 2);
    });

    it('should support sorting and limiting together', async () => {
      const collection = new InMemoryCollection<TestDoc>();
      
      await collection.insertMany([
        { name: 'c', value: 3 },
        { name: 'a', value: 1 },
        { name: 'b', value: 2 },
      ]);

      const docs = await collection
        .find()
        .sort({ value: -1 })
        .limit(2)
        .toArray();

      assertEquals(docs.length, 2);
      assertEquals(docs[0].value, 3);
      assertEquals(docs[1].value, 2);
    });
  });

  describe('updateOne', () => {
    it('should update existing document', async () => {
      const collection = new InMemoryCollection<TestDoc>();
      
      await collection.insertOne({ name: 'test', value: 100 });
      
      const result = await collection.updateOne(
        { name: 'test' },
        { $set: { value: 200 } },
      );

      assertEquals(result.modifiedCount, 1);

      const updated = await collection.findOne({ name: 'test' });
      assertEquals(updated?.value, 200);
    });

    it('should support upsert when document does not exist', async () => {
      const collection = new InMemoryCollection<TestDoc>();
      
      const result = await collection.updateOne(
        { name: 'new' },
        { $set: { value: 300 } },
        { upsert: true },
      );

      assertEquals(result.upsertedCount, 1);

      const doc = await collection.findOne({ name: 'new' });
      assert(doc);
      assertEquals(doc.value, 300);
    });
  });

  describe('findOneAndReplace', () => {
    it('should replace existing document', async () => {
      const collection = new InMemoryCollection<TestDoc>();
      
      await collection.insertOne({ name: 'old', value: 100 });
      
      const result = await collection.findOneAndReplace(
        { name: 'old' },
        { name: 'new', value: 200 },
      );

      assert(result);
      assertEquals(result.name, 'new');
      assertEquals(result.value, 200);

      const found = await collection.findOne({ name: 'new' });
      assert(found);
    });

    it('should upsert when document does not exist', async () => {
      const collection = new InMemoryCollection<TestDoc>();
      
      const result = await collection.findOneAndReplace(
        { name: 'nonexistent' },
        { name: 'created', value: 400 },
        { upsert: true },
      );

      assert(result);
      assertEquals(result.name, 'created');
    });
  });

  describe('comparison operators', () => {
    it('should support $gt operator', async () => {
      const collection = new InMemoryCollection<TestDoc>();
      
      await collection.insertMany([
        { name: 'a', value: 10 },
        { name: 'b', value: 20 },
        { name: 'c', value: 30 },
      ]);

      const docs = await collection.find({ value: { $gt: 15 } }).toArray();
      assertEquals(docs.length, 2);
      assert(docs.every(d => d.value > 15));
    });

    it('should support $exists operator', async () => {
      const collection = new InMemoryCollection<TestDoc>();
      
      await collection.insertMany([
        { name: 'a', value: 10, category: 'x' },
        { name: 'b', value: 20 },
      ]);

      const withCategory = await collection
        .find({ category: { $exists: true } })
        .toArray();
      
      assertEquals(withCategory.length, 1);
      assertEquals(withCategory[0].name, 'a');
    });
  });

  describe('clear', () => {
    it('should remove all documents', async () => {
      const collection = new InMemoryCollection<TestDoc>();
      
      await collection.insertMany([
        { name: 'a', value: 1 },
        { name: 'b', value: 2 },
      ]);

      collection.clear();

      const count = await collection.countDocuments();
      assertEquals(count, 0);
    });
  });
});
```

**Validation**:
```bash
deno test src/database/testing/memory-collection.test.ts
```

---

### Phase 2: Mock Service Builders

#### 2.1 Create Mock Helpers
**File**: `src/common/testing/mock-helpers.ts`

```typescript
import { stub, type Stub } from '@std/testing/mock';
import type { LoggerService } from '@scope/logger';
import type { ExperimentService } from '@scope/experiment';
import type { CacheService } from '@scope/cache';

/**
 * Create a mock logger service for testing
 */
export function createMockLogger(): LoggerService {
  return {
    instance: {
      debug: stub(),
      info: stub(),
      warn: stub(),
      error: stub(),
    },
  } as unknown as LoggerService;
}

/**
 * Create a mock experiment service with configurable feature flags
 */
export function createMockExperiment(
  flags: Record<string, unknown> = {},
): ExperimentService {
  return {
    isEnabled: stub((key: string) => Boolean(flags[key])),
    getFeatureValue: stub((key: string, defaultValue: unknown) => {
      return flags[key] !== undefined ? flags[key] : defaultValue;
    }),
  } as unknown as ExperimentService;
}

/**
 * Create a mock cache service with in-memory storage
 */
export function createMockCache(): CacheService {
  const cache = new Map<string, { value: unknown; expiresAt: number }>();

  return {
    get: stub(async (key: string) => {
      const entry = cache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
      }
      return entry.value;
    }),
    set: stub(async (key: string, value: unknown, options?: { ttl?: number }) => {
      const ttl = (options?.ttl || 60) * 1000; // Convert to ms
      cache.set(key, {
        value,
        expiresAt: Date.now() + ttl,
      });
    }),
    delete: stub(async (key: string) => {
      cache.delete(key);
    }),
    clear: stub(async () => {
      cache.clear();
    }),
  } as unknown as CacheService;
}

/**
 * Type-safe stub creator
 */
export function createStub<T, K extends keyof T>(
  target: T,
  method: K,
): Stub<T, Parameters<T[K] extends (...args: any[]) => any ? T[K] : never>> {
  return stub(target, method);
}
```

#### 2.2 Create Test for Mock Helpers
**File**: `src/common/testing/mock-helpers.test.ts`

```typescript
import { describe, it } from '@std/testing/bdd';
import { assertEquals, assert } from '@std/assert';
import { assertSpyCalls } from '@std/testing/mock';
import {
  createMockLogger,
  createMockExperiment,
  createMockCache,
} from './mock-helpers.ts';

describe('Mock Helpers', () => {
  describe('createMockLogger', () => {
    it('should create a logger with stubbed methods', () => {
      const logger = createMockLogger();
      
      logger.instance.info('test message');
      logger.instance.error('error message');
      
      assertSpyCalls(logger.instance.info, 1);
      assertSpyCalls(logger.instance.error, 1);
    });
  });

  describe('createMockExperiment', () => {
    it('should return flag values', () => {
      const experiment = createMockExperiment({
        'feature-a': true,
        'threshold': 0.8,
      });

      assertEquals(experiment.isEnabled('feature-a'), true);
      assertEquals(experiment.isEnabled('feature-b'), false);
      assertEquals(experiment.getFeatureValue('threshold', 0.5), 0.8);
      assertEquals(experiment.getFeatureValue('missing', 'default'), 'default');
    });
  });

  describe('createMockCache', () => {
    it('should store and retrieve values', async () => {
      const cache = createMockCache();
      
      await cache.set('key1', { data: 'value' });
      const value = await cache.get('key1');
      
      assertEquals(value, { data: 'value' });
    });

    it('should return null for missing keys', async () => {
      const cache = createMockCache();
      const value = await cache.get('nonexistent');
      assertEquals(value, null);
    });

    it('should respect TTL expiration', async () => {
      const cache = createMockCache();
      
      await cache.set('key1', 'value', { ttl: 0.001 }); // 1ms TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const value = await cache.get('key1');
      assertEquals(value, null);
    });
  });
});
```

---

### Phase 4: Fixture Management

#### 4.1 Create Fixtures Directory
```bash
mkdir -p src/common/testing/fixtures/{jikan,skyhook,tmdb,arm}
```

#### 4.2 Sample Fixture Files

**File**: `src/common/testing/fixtures/jikan/anime-sample.json`
```json
{
  "data": {
    "mal_id": 123,
    "url": "https://myanimelist.net/anime/123",
    "title": "Test Anime",
    "title_english": "Test Anime",
    "title_japanese": "テストアニメ",
    "type": "TV",
    "episodes": 24,
    "status": "Finished Airing",
    "airing": false,
    "score": 8.5,
    "scored_by": 10000,
    "synopsis": "This is a test anime for testing purposes."
  }
}
```

**File**: `src/common/testing/fixtures/jikan/episodes-sample.json`
```json
{
  "data": [
    {
      "mal_id": 1,
      "title": "Episode 1",
      "title_japanese": "第1話",
      "title_romanji": "Dai 1-wa",
      "aired": "2024-01-01T00:00:00+00:00",
      "score": 8.0,
      "filler": false,
      "recap": false
    },
    {
      "mal_id": 2,
      "title": "Episode 2",
      "title_japanese": "第2話",
      "title_romanji": "Dai 2-wa",
      "aired": "2024-01-08T00:00:00+00:00",
      "score": 8.2,
      "filler": false,
      "recap": false
    }
  ],
  "pagination": {
    "has_next_page": false,
    "last_visible_page": 1
  }
}
```

#### 4.3 Fixture Loader
**File**: `src/common/testing/fixture-loader.ts`

```typescript
import { join } from '@std/path';

const FIXTURES_DIR = join(
  Deno.cwd(),
  'src',
  'common',
  'testing',
  'fixtures',
);

/**
 * Load a JSON fixture file
 */
export async function loadFixture<T = unknown>(
  path: string,
): Promise<T> {
  const fullPath = join(FIXTURES_DIR, path);
  const content = await Deno.readTextFile(fullPath);
  return JSON.parse(content) as T;
}

/**
 * Load Jikan anime fixture
 */
export async function loadJikanAnime(malId: number = 123) {
  return loadFixture(`jikan/anime-${malId}.json`).catch(() =>
    loadFixture('jikan/anime-sample.json')
  );
}

/**
 * Load Jikan episodes fixture
 */
export async function loadJikanEpisodes(malId: number = 123, page: number = 1) {
  return loadFixture(`jikan/episodes-${malId}-page${page}.json`).catch(() =>
    loadFixture('jikan/episodes-sample.json')
  );
}

/**
 * Load Skyhook show fixture
 */
export async function loadSkyhookShow(tvdb: number = 456) {
  return loadFixture(`skyhook/show-${tvdb}.json`).catch(() =>
    loadFixture('skyhook/show-sample.json')
  );
}
```

#### 4.4 Test for Fixture Loader
**File**: `src/common/testing/fixture-loader.test.ts`

```typescript
import { describe, it } from '@std/testing/bdd';
import { assert } from '@std/assert';
import { loadFixture, loadJikanAnime } from './fixture-loader.ts';

describe('Fixture Loader', () => {
  it('should load JSON fixture', async () => {
    const data = await loadFixture('jikan/anime-sample.json');
    assert(data);
    assert(typeof data === 'object');
  });

  it('should load Jikan anime fixture', async () => {
    const anime = await loadJikanAnime();
    assert(anime);
    assert(anime.data);
    assert(anime.data.mal_id);
  });
});
```

---

### Phase 5: Mock Fetch Helpers

#### 5.1 Create Mock Fetch Utilities
**File**: `src/common/testing/mock-fetch-helpers.ts`

```typescript
import { mockFetch, json, onGet, resetFetch } from '@c4spar/mock-fetch';

/**
 * Mock Jikan anime endpoint
 */
export function mockJikanAnime(malId: number, data: unknown) {
  mockFetch(
    onGet(`https://api.jikan.moe/v4/anime/${malId}`),
    json({ data }),
  );
}

/**
 * Mock Jikan anime full endpoint
 */
export function mockJikanAnimeFull(malId: number, data: unknown) {
  mockFetch(
    onGet(`https://api.jikan.moe/v4/anime/${malId}/full`),
    json({ data }),
  );
}

/**
 * Mock Jikan episodes endpoint
 */
export function mockJikanEpisodes(
  malId: number,
  page: number,
  episodes: unknown[],
  hasNext: boolean = false,
) {
  mockFetch(
    onGet(`https://api.jikan.moe/v4/anime/${malId}/episodes?page=${page}`),
    json({
      data: episodes,
      pagination: {
        has_next_page: hasNext,
        last_visible_page: page,
      },
    }),
  );
}

/**
 * Reset all fetch mocks (call in afterEach)
 */
export { resetFetch };

/**
 * Setup and teardown helpers for tests
 */
export function setupMockFetch() {
  // Setup logic if needed
}

export function teardownMockFetch() {
  resetFetch();
}
```

---

## Validation Checklist

After implementing all phases, validate the infrastructure:

### Phase 1: In-Memory Collection
- [ ] All collection operations work (insert, find, update)
- [ ] Sorting and limiting function correctly
- [ ] Comparison operators ($gt, $lt, etc.) work
- [ ] Tests pass: `deno test src/database/testing/memory-collection.test.ts`

### Phase 2: Mock Helpers
- [ ] Mock logger captures calls
- [ ] Mock experiment returns configured flags
- [ ] Mock cache stores and retrieves values with TTL
- [ ] Tests pass: `deno test src/common/testing/mock-helpers.test.ts`

### Phase 3: Data Builders
- [ ] Episode builder creates valid episodes
- [ ] Fluent API chains methods correctly
- [ ] buildMany creates multiple episodes

### Phase 4: Fixtures
- [ ] JSON fixtures load successfully
- [ ] Fixture loader handles missing files gracefully
- [ ] Tests pass: `deno test src/common/testing/fixture-loader.test.ts`

### Phase 5: Mock Fetch
- [ ] Fetch mocks intercept HTTP calls
- [ ] Reset clears all mocks between tests
- [ ] Integration with `@c4spar/mock-fetch` works

---

## Integration Test

Create a comprehensive integration test that uses all infrastructure:

**File**: `src/common/testing/integration.test.ts`

```typescript
import { describe, it, beforeEach, afterEach } from '@std/testing/bdd';
import { assertEquals, assert } from '@std/assert';
import { InMemoryCollection } from './memory-collection.ts';
import { EpisodeBuilder } from './builders/episode.builder.ts';
import {
  createMockLogger,
  createMockExperiment,
  createMockCache,
} from './mock-helpers.ts';
import {
  mockJikanEpisodes,
  resetFetch,
} from './mock-fetch-helpers.ts';

describe('Testing Infrastructure Integration', () => {
  let collection: InMemoryCollection<any>;

  beforeEach(() => {
    collection = new InMemoryCollection();
  });

  afterEach(() => {
    collection.clear();
    resetFetch();
  });

  it('should work with all infrastructure components', async () => {
    // 1. Build test data
    const episodes = new EpisodeBuilder()
      .withId(1)
      .buildMany(5);

    // 2. Store in in-memory collection
    await collection.insertMany(episodes);

    // 3. Retrieve and verify
    const retrieved = await collection.find().toArray();
    assertEquals(retrieved.length, 5);

    // 4. Use mock services
    const logger = createMockLogger();
    const experiment = createMockExperiment({ 'test-flag': true });
    const cache = createMockCache();

    logger.instance.info('Test log');
    assert(experiment.isEnabled('test-flag'));
    
    await cache.set('key', 'value');
    const cached = await cache.get('key');
    assertEquals(cached, 'value');

    // 5. Mock fetch
    mockJikanEpisodes(123, 1, [{ mal_id: 1, title: 'Ep 1' }]);
    
    const response = await fetch(
      'https://api.jikan.moe/v4/anime/123/episodes?page=1'
    );
    const data = await response.json();
    
    assert(data.data);
    assertEquals(data.data[0].mal_id, 1);
  });
});
```

**Validation**:
```bash
deno test src/common/testing/integration.test.ts
```

---

## Usage Examples

### Example 1: Repository Test with In-Memory Collection

```typescript
describe('EpisodesRepository', () => {
  let repository: EpisodesRepository;
  let collection: InMemoryCollection<EpisodeDocument>;

  beforeEach(() => {
    collection = new InMemoryCollection();
    const logger = createMockLogger();
    const experiment = createMockExperiment({});
    
    repository = new EpisodesRepository(
      collection,
      logger,
      experiment,
      // ... other dependencies
    );
  });

  it('should cache episodes', async () => {
    const episodes = new EpisodeBuilder().buildMany(10);
    
    await collection.insertOne({
      seriesKey: '123',
      updatedAt: Date.now(),
      episodes,
      airing: false,
    });

    const result = await repository.invoke(123, { limit: 5 });
    assertEquals(result.data.length, 5);
  });
});
```

### Example 2: Service Test with Mock Fetch

```typescript
describe('JikanService', () => {
  let service: JikanService;

  beforeEach(() => {
    service = new JikanService(
      createMockLogger(),
      // ... other dependencies
    );
  });

  afterEach(() => {
    resetFetch();
  });

  it('should fetch anime', async () => {
    mockJikanAnime(123, { mal_id: 123, title: 'Test' });
    
    const anime = await service.getAnime(123);
    assert(anime);
    assertEquals(anime.mal_id, 123);
  });
});
```

---

## Troubleshooting

### Issue: Tests fail with "Collection not found"
**Solution**: Ensure `InMemoryCollection` is properly instantiated in `beforeEach`

### Issue: Fetch mocks not working
**Solution**: Call `resetFetch()` in `afterEach` to clear previous mocks

### Issue: Type errors with builders
**Solution**: Ensure episode types are imported correctly from `@scope/package/episodes`

### Issue: Fixture files not found
**Solution**: Check that fixtures directory exists and paths are correct

---

## Next Steps

After completing this infrastructure setup:

1. **Validate all tests pass**:
   ```bash
   deno test src/common/testing/*.test.ts
   ```

2. **Document usage in team wiki or README**

3. **Start migration work**: Begin with Phase 2 (Episodes helpers) from the main migration plan

4. **Extend as needed**: Add more builders, fixtures, or mock helpers as migration progresses

---

## Maintenance

### Adding New Fixtures
1. Create JSON file in appropriate subdirectory
2. Add loader function in `fixture-loader.ts`
3. Update tests

### Extending Builders
1. Add new methods following fluent API pattern
2. Update `build()` method with defaults
3. Add test cases

### Supporting New Collections
The `InMemoryCollection` should work for most cases, but if you need custom operators:
1. Update `matchesFilter()` method
2. Add test cases for new operators

---

## Document Metadata

- **Created**: 2025-01-07
- **Purpose**: Test infrastructure setup for episodes/series migration
- **Prerequisites**: Main migration plan document
- **Estimated Time**: 1 day
- **Status**: Ready for Implementation
