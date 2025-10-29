# Phase 1: Collection Infrastructure Implementation

**Status**: ✅ Complete\
**Date**: 2025-01-24\
**Related Docs**: [mongodb-interface-design.md](./mongodb-interface-design.md), [service-audit.md](./service-audit.md)

## Overview

Implemented the core Collection<T> persistence abstraction layer based on analysis of on-the-edge repository patterns. This infrastructure provides a minimal, type-safe interface for MongoDB operations with full testing support.

## Implementation Summary

### 1. Collection Interface (`src/common/collection/collection.interface.ts`)

Created minimal 3-method interface based on actual usage in on-the-edge:

```typescript
interface Collection<T extends Document> {
  findOne(filter: Filter<T>, options?: FindOptions): Promise<WithId<T> | null>;
  findOneAndReplace(
    filter: Filter<T>,
    replacement: T,
    options: FindOneAndReplaceOptions,
  ): Promise<WithId<T> | null>;
  updateOne(
    filter: Filter<T>,
    update: UpdateFilter<T>,
    options?: UpdateOneOptions,
  ): Promise<UpdateResult>;
}
```

**Supporting Types:**

- `WithId<T>` - Makes MongoDB _id field explicit at compile time
- `FindOneAndReplaceOptions` - upsert and returnDocument options
- `UpdateOneOptions` - upsert option
- `UpdateResult` - Counts from updateOne operation

**Design Rationale:**
Analysis of on-the-edge showed these 3 operations cover all repository needs:

- `findOne` - Cache reads, existence checks
- `findOneAndReplace` - Upsert pattern (atomic read-modify-write)
- `updateOne` - Partial updates, TTL management

### 2. MongoDB Production Adapter (`src/common/collection/mongo-collection.adapter.ts`)

Thin wrapper around MongoDB driver's Collection:

```typescript
export class MongoCollectionAdapter<T extends Document>
  implements Collection<T> {
  constructor(private readonly mongoCollection: MongoCollection<T>) {}

  // Delegates to MongoDB driver with type conversions
  async findOne(filter, options?): Promise<WithId<T> | null>;
  async findOneAndReplace(
    filter,
    replacement,
    options,
  ): Promise<WithId<T> | null>;
  async updateOne(filter, update, options?): Promise<UpdateResult>;
}
```

**Key Features:**

- Delegates directly to MongoDB driver methods
- Converts MongoDB types to interface types
- Defaults `returnDocument` to 'after' for consistency
- Minimal overhead (single method call per operation)

### 3. InMemoryCollection Updates (`src/common/testing/memory-collection.ts`)

Updated existing InMemoryCollection to explicitly implement Collection<T>:

**Changes:**

- Added `implements Collection<T>` to class declaration
- Imported shared types from `@scope/database/collection`
- Updated `findOneAndReplace` signature to require options parameter
- Removed duplicate local type definitions

**Preserved Features:**

- All additional test-friendly methods (find, insertMany, insertOne, clear, countDocuments)
- Full MongoDB filter support (comparison operators, logical operators)
- Sorting and limiting support
- Deterministic, offline operation

### 4. Module Configuration

**Updated `src/common/deno.json`:**

```json
{
  "exports": {
    "./collection": "./collection/index.ts"
  }
}
```

**Created barrel export** (`src/common/collection/index.ts`):

```typescript
export * from './collection.interface.ts';
export * from './mongo-collection.adapter.ts';
```

**Usage Pattern:**

- Production: `import { Collection, MongoCollectionAdapter } from '@scope/database/collection'`
- Testing: `import { InMemoryCollection } from '@scope/database/testing'`

## Test Results

All InMemoryCollection tests pass (30 test steps):

- ✅ insertMany and findOne
- ✅ find with sorting and limiting
- ✅ updateOne (including upsert)
- ✅ findOneAndReplace (including upsert)
- ✅ comparison operators ($gt, $lt, $gte, $lte, $exists)
- ✅ clear and countDocuments
- ✅ insertOne

Updated test signatures to match new interface requirement (options parameter required for findOneAndReplace).

## Files Created

1. `src/common/collection/collection.interface.ts` (~260 lines)
   - Collection<T> interface definition
   - Supporting types (WithId, options, results)
   - Comprehensive JSDoc with examples

2. `src/common/collection/mongo-collection.adapter.ts` (~125 lines)
   - MongoCollectionAdapter implementation
   - MongoDB driver wrapper
   - Type conversion logic

3. `src/common/collection/index.ts` (~20 lines)
   - Barrel exports for module
   - Module-level documentation

## Files Updated

1. `src/common/testing/memory-collection.ts`
   - Added `implements Collection<T>`
   - Imported shared types
   - Updated method signatures

2. `src/database/testing/memory-collection.test.ts`
   - Fixed findOneAndReplace calls to include options parameter

3. `src/common/deno.json`
   - Added `./collection` export path

## Validation

```bash
# Type checking passes
deno check src/common/collection/collection.interface.ts
deno check src/common/collection/mongo-collection.adapter.ts
deno check src/common/testing/memory-collection.ts

# Formatting consistent
deno fmt src/common/collection/ src/common/testing/memory-collection.ts

# Linting clean
deno lint src/common/collection/ src/common/testing/memory-collection.ts

# All collection tests pass
deno test -P src/database/testing/memory-collection.test.ts
# Result: 30/30 test steps passing
```

## Design Patterns

### Adapter Pattern

Two implementations behind single interface:

- `MongoCollectionAdapter` for production (wraps MongoDB driver)
- `InMemoryCollection` for testing (in-memory storage)

Repositories depend on `Collection<T>` interface, not concrete implementations.

### Upsert Pattern

Primary cache strategy using `findOneAndReplace`:

```typescript
await collection.findOneAndReplace(
  { seriesKey: '123' },
  { seriesKey: '123', episodes: [...], updatedAt: Date.now() },
  { upsert: true }
);
```

**Benefits:**

- Single code path for create/update
- Atomic operation (race-condition safe)
- No "exists check" needed

### Type Safety

`WithId<T>` makes MongoDB's _id field explicit:

```typescript
const doc = await collection.findOne({ name: 'test' });
if (doc) {
  console.log(doc._id); // TypeScript knows _id exists
}
```

## Architecture Alignment

Matches on-the-edge patterns:

- Minimal interface (only operations actually used)
- Adapter pattern for testing
- Type-safe MongoDB operations
- Explicit _id handling

Ready for Phase 2 (episodes module) and Phase 3 (series module).

## Next Steps

1. **Todo #4**: Align type system with on-the-edge
   - Map EpisodeCanonical, EpisodeDocument types
   - Map SeriesDocument, MediaEntity types
   - Create domain schemas under src/package/episodes/ and src/package/series/

2. **Todo #5**: Port episodes module
   - Create EpisodesRepository using Collection<EpisodeDocument>
   - Implement TTL-based caching (12h airing, 7d completed)
   - Port source integrations (Jikan, Skyhook, TMDB)

3. **Todo #6**: Port series module
   - Create SeriesRepository using Collection<SeriesDocument>
   - Implement caching with TTL
   - Add feature flag for multi-source merging

## References

- [MongoDB Interface Design Document](./mongodb-interface-design.md)
- [Service Audit](./service-audit.md)
- [on-the-edge Collection Interface](https://github.com/AniTrend/on-the-edge/blob/main/src/common/core/collection.ts)
- [on-the-edge Episodes Repository](https://github.com/AniTrend/on-the-edge/blob/main/src/episodes/repository/episodes.repository.ts)
