# Service Refactoring Guide

**Date**: October 7, 2025  
**Status**: Reference Document

## Overview

This guide documents the standardized pattern established in the `otakumode` service and outlines how to refactor other services to follow the same conventions. The goal is consistency across all services in schema validation, type inference, and public API exposure.

## Reference Implementation: OtakuMode Service

### File Structure
```
otakumode/
├── index.ts                    # Public API exports
├── otakumode.module.ts         # Danet module definition
├── otakumode.schema.ts         # Zod schemas for domain models
├── otakumode.service.ts        # Service implementation
├── otakumode.service.test.ts   # Service tests
├── otakumode.types.ts          # Domain types (inferred from schemas)
└── types.ts                    # Internal/API-specific types
```

### Pattern Breakdown

#### 1. Schema File (`*.schema.ts`)

**Purpose**: Define Zod schemas for **domain models** that represent the service's public data structures.

**Example**: `otakumode.schema.ts`
```typescript
import { z } from 'zod';
import { toInstant } from '@scope/common/utils';

// Domain entity schema
export const ItemSchema = z.object({
  title: z.string(),
  link: z.string().url(),
  description: z.string(),
  'content:encoded': z.string(),
  pubDate: z.string().transform((date) => toInstant(date)),
  guid: z.string(),
  mainId: z.string(),
  category: z.string().nullish(),
  // ... more fields
});

// Container schema (if needed for parsing)
export const ChannelSchema = z.object({
  title: z.string(),
  link: z.string().url(),
  description: z.string(),
  author: z.string(),
  language: z.string(),
  item: z.array(ItemSchema).optional().default([]),
});

// Root schema for API response structure
export const RssSchema = z.object({
  rss: z.object({
    channel: ChannelSchema,
  }),
});
```

**Key Points**:
- ✅ Define schemas that represent the **domain model** (what the service conceptually returns)
- ✅ Use `.transform()` for data enrichment (e.g., date parsing)
- ✅ Use `.passthrough()` if API returns extra fields you want to ignore
- ✅ Export schemas that are needed for validation in the service
- ✅ Type inference happens in `*.types.ts`, not here

#### 2. Domain Types File (`*.types.ts`)

**Purpose**: Infer TypeScript types from domain schemas and define service-specific interfaces.

**Example**: `otakumode.types.ts`
```typescript
import { z } from 'zod';
import { ItemSchema } from './otakumode.schema.ts';

// Infer type from domain schema
export type OtakumodeFeed = z.infer<typeof ItemSchema>[] | undefined;
```

**Key Points**:
- ✅ Use `z.infer<typeof Schema>` to derive types
- ✅ Define service-specific types (e.g., aggregate types, enriched types)
- ✅ This file is **exported** in `index.ts` for public consumption
- ✅ Keep types close to their domain meaning

#### 3. Internal Types File (`types.ts`)

**Purpose**: Define **API-specific** or **internal** schemas and types that are not part of the public domain model.

**Example**: `otakumode/types.ts`
```typescript
import { z } from 'zod';

// API response validation (before transformation)
export const FeedSchema = z.string().min(1, {
  message: 'RSS feed cannot be empty',
});
export type FeedResponse = z.infer<typeof FeedSchema>;
```

**Key Points**:
- ✅ Define schemas for **raw API responses** (before transformation)
- ✅ Define intermediate types needed for parsing/unwrapping
- ✅ This file is **NOT exported** in `index.ts` (internal only)
- ✅ Use for validation steps before mapping to domain schemas

#### 4. Service File (`*.service.ts`)

**Purpose**: Implement the service with proper DI, HTTP client usage, and transformation pipeline.

**Example**: `otakumode.service.ts`
```typescript
@Injectable()
export class OtakumodeService {
  private readonly client: RequestClient;

  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    this.client = new RequestClient({
      baseURL: this.secret.get('FEED'),
      headers: { ...DEFAULT_HEADERS, 'content-type': 'application/xml' },
      timeoutMs: this.secret.requestTimeout(),
      retry: { retries: 2, baseDelayMs: 200 },
    });
  }

  async rss(_locale: string): Promise<OtakumodeFeed> {
    return await this.client
      .request(`/news/feed`)
      .label('fetch latest news feed')
      .parse('text')  // Parse as text first (XML)
      .send<FeedResponse>()
      .then(({ data }) => FeedSchema.safeParse(data))  // Validate raw response
      .then(({ data, error }) => {
        if (!error && data) {
          const xml = parse(data, { flatten: { attributes: true } });
          const { data: rssData, error: rssError } = RssSchema.safeParse(xml);
          if (!rssError && rssData) {
            return rssData.rss.channel.item;  // Return domain model
          }
          throw rssError;
        }
        throw error;
      })
      .catch((error) => {
        this.logger.instance.error('Unable to fetch news feed from remote', error);
        return undefined;
      });
  }
}
```

**Key Points**:
- ✅ Use `RequestClient` with base URL from `SecretService`
- ✅ Chain `.label()` for observability
- ✅ Use `.safeParse()` for validation (allows error handling)
- ✅ Multiple validation stages if needed (raw → intermediate → domain)
- ✅ Return domain types (from `*.types.ts`)
- ✅ Log errors with context

#### 5. Index File (`index.ts`)

**Purpose**: Define the public API surface of the service module.

**Example**: `otakumode/index.ts`
```typescript
export * from './otakumode.module.ts';
export * from './otakumode.service.ts';
export * from './otakumode.types.ts';
// Note: types.ts is NOT exported (internal only)
```

**Key Points**:
- ✅ Export module, service, and domain types
- ✅ Export schemas if they're needed externally (e.g., for testing)
- ✅ Do NOT export internal `types.ts`
- ✅ Optionally export transformers if service has them

---

## Pattern Comparison: Current vs. Target

### Current Pattern Issues

#### Jikan Service (Example)

**Current `jikan.schema.ts`**:
```typescript
// ❌ Mixing schema definitions with type exports
export type AnimeResource = z.infer<typeof AnimeResourceSchema>;
export type MangaResource = z.infer<typeof MangaResourceSchema>;
export type AnimeEpisode = z.infer<typeof AnimeEpisodeSchema>;
```

**Current `types.ts`**:
```typescript
// ✅ Domain types extending schema types
export interface JikanAnime extends AnimeResource {
  moreinfo?: string | null;
}
```

**Current `index.ts`**:
```typescript
// ❌ Exports everything including internal types
export * from './jikan.schema.ts';
export * from './types.ts';
```

### Target Pattern (OtakuMode-Style)

#### Jikan Service (Refactored)

**Target `jikan.schema.ts`**:
```typescript
// ✅ Pure schema definitions, no type exports
export const AnimeResourceSchema = MalResourceBaseSchema.extend({
  // ... schema definition
});

export const AnimeEpisodeSchema = z.object({
  mal_id: z.number(),
  // ... all fields except `kind` which is enriched
});

// NO type exports here
```

**Target `jikan.types.ts`**:
```typescript
import { z } from 'zod';
import { AnimeResourceSchema, AnimeEpisodeSchema } from './jikan.schema.ts';

// ✅ Infer base types from schemas
export type AnimeResource = z.infer<typeof AnimeResourceSchema>;
export type AnimeEpisode = z.infer<typeof AnimeEpisodeSchema>;

// ✅ Enriched domain type (with moreinfo from separate endpoint)
export interface JikanAnime extends AnimeResource {
  moreinfo?: string | null;
  episodes_list?: AnimeEpisode[];
  episodes_truncated?: boolean;
}
```

**Target `types.ts` (internal)**:
```typescript
import { z } from 'zod';

// ✅ API response wrapper (if needed)
export const AnimeResponseSchema = z.object({
  data: AnimeResourceSchema,
});
export type AnimeResponse = z.infer<typeof AnimeResponseSchema>;

// ✅ Options interfaces (not from API)
export interface JikanFetchOptions {
  episodes?: boolean;
  maxEpisodes?: number;
  episodeWindow?: { from?: number; to?: number };
}
```

**Target `index.ts`**:
```typescript
// ✅ Selective exports
export * from './jikan.module.ts';
export * from './jikan.service.ts';
export * from './jikan.types.ts';
export * from './transformer/index.ts';
export * from './episode-utils.ts';
// Note: types.ts NOT exported
```

---

## Enrichment Pattern

### When Fields Don't Come from API

Some fields are **enriched** during processing and don't exist in the raw API response:

#### Example: Jikan `kind` field

**Problem**: The `kind` field (e.g., `'main' | 'ova' | 'special'`) is added during `enrichEpisodes()` but isn't in the API response.

**Solution**:

1. **Schema Definition** (raw API shape):
```typescript
// jikan.schema.ts
export const AnimeEpisodeSchema = z.object({
  mal_id: z.number(),
  title: z.string().nullish(),
  // ... all API fields
  // NO kind field here - it's enriched later
});
```

2. **Type Definition** (enriched shape):
```typescript
// jikan.types.ts
import { z } from 'zod';
import { AnimeEpisodeSchema } from './jikan.schema.ts';

// Base type from schema
export type AnimeEpisodeBase = z.infer<typeof AnimeEpisodeSchema>;

// Enriched type with additional fields
export interface AnimeEpisode extends AnimeEpisodeBase {
  kind?: 'main' | 'ova' | 'ona' | 'special' | 'movie';
}
```

3. **Enrichment Function**:
```typescript
// episode-utils.ts
export function enrichEpisodes(
  episodes: AnimeEpisodeBase[]
): AnimeEpisode[] {
  return episodes.map(ep => ({
    ...ep,
    kind: deriveKind(ep),  // Add enriched field
  }));
}
```

---

## Multi-Stage Validation Pattern

### When API Response Needs Unwrapping

Some APIs return nested structures that need multiple validation stages:

#### Example: OtakuMode RSS Feed

```typescript
// Stage 1: Validate raw response (XML string)
const { data } = await this.client.send<FeedResponse>();
const rawValidation = FeedSchema.safeParse(data);

// Stage 2: Parse XML to object
const xml = parse(rawValidation.data, { flatten: { attributes: true } });

// Stage 3: Validate parsed structure
const { data: rssData } = RssSchema.safeParse(xml);

// Stage 4: Extract domain model
return rssData.rss.channel.item;  // OtakumodeFeed type
```

**Key Points**:
- ✅ Each stage has its own schema
- ✅ Raw response schema in `types.ts` (internal)
- ✅ Domain schema in `*.schema.ts` (public)
- ✅ Final return type from `*.types.ts` (public)

---

## Refactoring Checklist (Per Service)

### 1. Review Current Structure
- [ ] Identify which types come from API vs. enrichment
- [ ] Identify which schemas are internal (raw API) vs. domain
- [ ] Check if service has transformers (keep those patterns)

### 2. Refactor Schemas (`*.schema.ts`)
- [ ] Keep pure Zod schema definitions
- [ ] Remove type exports (move to `*.types.ts`)
- [ ] Keep only domain-level schemas
- [ ] Add `.passthrough()` if needed

### 3. Create/Update Domain Types (`*.types.ts`)
- [ ] Use `z.infer<typeof Schema>` for base types
- [ ] Define enriched types (e.g., `JikanAnime extends AnimeResource`)
- [ ] Add service-specific aggregate types
- [ ] Keep this file focused on **public** types

### 4. Create/Update Internal Types (`types.ts`)
- [ ] Move raw API response schemas here
- [ ] Define intermediate validation types
- [ ] Add options/config interfaces
- [ ] This file is **NOT** exported in `index.ts`

### 5. Update Service Implementation
- [ ] Ensure proper validation pipeline
- [ ] Use `.safeParse()` for error handling
- [ ] Return domain types from `*.types.ts`
- [ ] Add proper logging

### 6. Update Index (`index.ts`)
- [ ] Export module, service, domain types
- [ ] Export transformers if present
- [ ] Do NOT export `types.ts` (internal)

### 7. Update Tests
- [ ] Use `mockJsonResponse(fullUrl, fixture)` pattern
- [ ] Load fixtures with `loadFixture()`
- [ ] Test both success and error paths

---

## Service-Specific Notes

### Jikan Service

**Current State**:
- ✅ Has comprehensive schemas
- ✅ Has enrichment utilities (`enrichEpisodes`, `episode-utils.ts`)
- ⚠️ Types exported from schema file
- ⚠️ `types.ts` contains both domain and options

**Refactoring Plan**:
1. Keep `AnimeEpisodeSchema` for base API shape (without `kind`)
2. Move type exports to `jikan.types.ts`
3. Create enriched `AnimeEpisode` interface with `kind` field
4. Move `JikanFetchOptions` to internal `types.ts`
5. Update `index.ts` to not export internal `types.ts`

### ARM Service

**Current State**:
- ✅ Simple schema with hyphenated keys
- ✅ Transformer maps to camelCase
- ⚠️ Type exported from schema file
- ℹ️ No internal `types.ts` file

**Refactoring Plan**:
1. Remove `ArmSchema` type export from `arm.schema.ts`
2. Create `arm.types.ts` with `z.infer<typeof ArmObjectSchema>`
3. Move `SeriesRelationId` to `arm.types.ts` (it's the transformed shape)
4. Update `index.ts` exports

### Skyhook Service

**Current State**:
- ✅ Has schemas and types separation
- ✅ Has transformer
- ⚠️ Check if all types are properly separated

**Refactoring Plan**:
1. Ensure domain types in `skyhook.types.ts`
2. Check if any internal types need `types.ts`
3. Verify transformer output types

### TMDB Service

**Current State**:
- ✅ Has multiple schemas (show, season, episode)
- ✅ Has image provider utilities
- ⚠️ Verify type separation

**Refactoring Plan**:
1. Ensure domain types properly separated
2. Check if configuration types need internal `types.ts`
3. Keep image provider utilities exported

### Trakt Service

**Current State**:
- ✅ Has schemas and transformer
- ⚠️ Needs episodes endpoints (per service audit)

**Refactoring Plan**:
1. Refactor existing structure to match pattern
2. Add season/episode schemas and endpoints
3. Separate API response types from domain types

### Theme Service

**Current State**:
- ✅ Exists with basic structure
- ⚠️ Implementation needs review

**Refactoring Plan**:
1. Review against OtakuMode pattern
2. Ensure proper type separation
3. Add tests if missing

### TheXem Service

**Current State**:
- ✅ Exists with basic structure
- ⚠️ Needs enhancement for episode number mapping

**Refactoring Plan**:
1. Review against OtakuMode pattern
2. Add caching if needed (like on-the-edge)
3. Ensure proper type separation

### Notify Service

**Current State**:
- ✅ Has basic implementation
- ⚠️ Needs review and potential expansion

**Refactoring Plan**:
1. Review against OtakuMode pattern
2. Ensure transformer patterns match
3. Add missing endpoints if needed

---

## Testing Pattern After Refactoring

### Service Test Structure

```typescript
import { createSecretStub } from '@scope/testing';
import { mockJsonResponse, resetFetch } from '@scope/testing';
import { loadFixture } from '@scope/testing';

describe('ServiceName', () => {
  let service: ServiceName;
  let secrets: SecretService;
  let logger: LoggerService;

  beforeEach(() => {
    secrets = createSecretStub({
      SERVICE_KEY: 'https://service.test',
    });
    logger = createLoggerStub();
    service = new ServiceName(secrets, logger);
  });

  afterEach(() => {
    resetFetch();
  });

  it('should fetch and transform data', async () => {
    const fixture = await loadFixture('service/resource-sample.json');
    const baseUrl = secrets.get('SERVICE_KEY');
    
    mockJsonResponse(`${baseUrl}/endpoint/123`, fixture);

    const result = await service.getResource(123);

    assert(result);
    assertEquals(result.id, 123);
  });

  it('should handle errors gracefully', async () => {
    const baseUrl = secrets.get('SERVICE_KEY');
    
    mockJsonResponse(`${baseUrl}/endpoint/999`, null, { status: 404 });

    const result = await service.getResource(999);

    assertEquals(result, undefined);
  });
});
```

---

## Migration Order (Recommendation)

1. **ARM Service** (simplest, good starter)
2. **Theme Service** (small surface area)
3. **TheXem Service** (small, needed for episodes)
4. **Notify Service** (needed for episodes merge)
5. **Skyhook Service** (already structured well)
6. **TMDB Service** (moderate complexity)
7. **Trakt Service** (needs new endpoints + refactor)
8. **Jikan Service** (most complex, do last)

---

## Common Pitfalls to Avoid

1. ❌ **Don't export types from schema files**
   - Schemas define structure, types define usage

2. ❌ **Don't mix API response types with domain types**
   - Use `types.ts` for API-specific, `*.types.ts` for domain

3. ❌ **Don't export internal `types.ts` in `index.ts`**
   - Keep API response schemas private to the service

4. ❌ **Don't add enriched fields to schemas**
   - Schemas validate API responses; enrichment happens after

5. ❌ **Don't forget to update tests after refactoring**
   - Ensure imports still work and types are correct

---

## Summary

**OtakuMode Pattern in Brief**:
- `*.schema.ts` = Pure Zod schemas for validation (no type exports)
- `*.types.ts` = Public domain types (inferred from schemas + enriched)
- `types.ts` = Internal API response types (not exported)
- `*.service.ts` = Implementation with proper validation pipeline
- `index.ts` = Controlled public API (exports only public types)

This pattern provides:
- ✅ Clear separation of concerns
- ✅ Type safety with runtime validation
- ✅ Clean public API surface
- ✅ Easy testing with fixtures
- ✅ Consistent structure across all services
