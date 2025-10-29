# Phase 2: Type System Alignment with on-the-edge

**Status**: ✅ Complete\
**Date**: 2025-10-07\
**Related Docs**: [mongodb-interface-design.md](./mongodb-interface-design.md), [phase1-collection-implementation.md](./phase1-collection-implementation.md)

## Overview

Aligned the Danet codebase type system with on-the-edge canonical patterns. Replaced existing episode and series types with comprehensive, production-tested definitions from the on-the-edge repository.

## Implementation Summary

### 1. Episodes Type Definitions (`src/package/episodes/episodes.types.ts`)

Replaced simple episode types with canonical on-the-edge definitions:

**Core Types Created:**

```typescript
// Canonical episode representation
interface EpisodeCanonical {
  id: number;
  number: number | null;
  title: EpisodeTitle | null;
  synopsis: string | null;
  aired: Instant | null;
  score: number | null;
  kind: EpisodeKind | null;
  duration: number | null;
  url: string | null;
  // Provider-specific metadata
  tvdbShowId: number | null;
  tvdbId: number | null;
  tmdbId: number | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  absoluteEpisodeNumber: number | null;
  // Special scheduling
  airedBeforeSeasonNumber: number | null;
  airedBeforeEpisodeNumber: number | null;
  airedAfterSeasonNumber: number | null;
  airedAfterEpisodeNumber: number | null;
  // Media
  image: string | null;
  poster: string | null;
  themes: EpisodeThemes;
}

// Episode classification
type EpisodeKind = 'main' | 'ova' | 'ona' | 'recap' | 'filler' | 'special';

// Pagination cursor
type EpisodeCursor = string; // base64-encoded JSON

// Filters
interface EpisodeFilters {
  kind?: EpisodeKind;
  specialsOnly?: boolean;
  start?: number;
  end?: number;
}

// Storage
interface EpisodeDocument {
  seriesKey: string;
  episodes: EpisodeCanonical[];
  airing: boolean | null;
  updatedAt: number;
}
```

**Removed Types:**

- `EpisodeSummary` (replaced by `EpisodeCanonical`)
- `EpisodeResponse` (replaced by `EpisodesPage` and `EpisodesDataResponse`)

**Key Features:**

- Multi-language title support (`EpisodeTitle`)
- Theme songs tracking (`EpisodeThemes`)
- Provider-specific IDs (TVDB, TMDB, MAL)
- Special scheduling fields for cross-season episodes
- Opaque cursor-based pagination
- Filter hash for cursor invalidation

### 2. Series Type Definitions (`src/package/series/series.types.ts`)

Replaced service-oriented types with canonical media entity definitions:

**Core Types Created:**

```typescript
// Comprehensive series IDs
interface SeriesId {
  anidb: number | null;
  anilist: number | null;
  animePlanet: string | null;
  anisearch: number | null;
  imdb: string | null;
  kitsu: number | null;
  livechart: number | null;
  notify: string | null;
  themoviedb: number | null;
  tvdb: number | null;
  myanimelist: number | null;
  tvMazeId: number | null;
  tvrage: string | null;
  slug: string | null;
  shoboi: number | null;
  trakt: number | null;
}

// Discriminated union for anime vs manga
type MediaUnion = (Media & AnimeMetadata) | (Media & MangaMetadata);

interface Media {
  kind: MediaKind;
  mediaId: SeriesId;
  cover: SeriesCoverImage;
  banner: string | null;
  fanart: string | null;
  format: Format | null;
  status: Status | null;
  source: Source | null;
  title: SeriesTitle;
  ageRating: string | null;
  images: SeriesImageAttributes[];
  description: string | null;
  updatedAt: Instant;
  moreInfo: string | null;
}

interface AnimeMetadata {
  kind: 'ANIME';
  duration: number | null;
  networks: SeriesNetwork[];
  themes: AnimeTheme[];
  trailers: SeriesTrailer[];
  schedule: SeriesSchedule | null;
}

interface MangaMetadata {
  kind: 'MANGA';
  volumes: number | null;
  chapters: number | null;
}
```

**Removed Types:**

- `SeriesIdentifiers` (replaced by `SeriesId`)
- `SeriesIdentifierSnapshot` (replaced by `SeriesId`)
- `SeriesServices` (moved to repository layer)
- `SeriesMappings` (moved to repository layer)
- `SeriesResponse` (replaced by `MediaEntity`)

**Key Features:**

- Discriminated union for anime/manga (type-safe)
- Comprehensive provider ID mapping
- Multi-language title support
- Rich metadata (networks, themes, trailers)
- Scheduling information for airing series
- Image attributes (posters, backdrops, logos)

### 3. Type Alignment Decisions

**Instant Type:**

- Source: `@scope/common/utils`
- Definition: `type Instant = number` (epoch seconds)
- Usage: All timestamps use Instant for consistency

**Discriminated Unions:**

- `MediaKind` discriminator: `'ANIME' | 'MANGA'`
- TypeScript narrows types based on `kind` field
- Enables type-safe property access

**Cursor Pattern:**

- Opaque string cursors (base64-encoded JSON)
- Payload: `{ pos: number; hash: string }`
- Filter hash invalidates stale cursors

**Null vs Undefined:**

- Use `null` for explicit absence
- Use `undefined` for optional parameters
- Consistent with on-the-edge conventions

## Design Patterns

### Multi-Language Support

Both episodes and series support multiple language variants:

```typescript
interface EpisodeTitle {
  english: string | null;
  romanji: string | null;
  native: string | null;
}

interface SeriesTitle {
  english: string | null;
  canonical: string | null;
  harigana: string | null;
  japanese: string | null;
  romaji: string | null;
  synonyms: string[] | null;
}
```

### Provider ID Mapping

Comprehensive ID tracking enables multi-source enrichment:

```typescript
interface SeriesId {
  anilist: number | null; // Primary ID
  myanimelist: number | null; // Jikan source
  thetvdb: number | null; // Skyhook source
  themoviedb: number | null; // TMDB source
  trakt: number | null; // Trakt source
  notify: string | null; // Notify.moe source
  // ... 11 more providers
}
```

### Discriminated Union

Type-safe anime/manga handling:

```typescript
function getAnimeSchedule(media: MediaEntity): SeriesSchedule | null {
  if (media.kind === 'ANIME') {
    return media.schedule; // TypeScript knows this exists
  }
  return null; // manga doesn't have schedule
}
```

### Cursor-Based Pagination

Stable pagination with filter invalidation:

```typescript
interface EpisodeCursorPayload {
  pos: number; // Position in filtered list
  hash: string; // Hash of filter criteria
}

// Changing filters invalidates old cursors
const cursor1 = encodeCursor({ pos: 10, hash: 'abc123' });
const cursor2 = encodeCursor({ pos: 10, hash: 'def456' }); // different filter
// cursor1 is invalid for new filter context
```

## Migration Impact

### Breaking Changes

**Episodes Module:**

- Old: `EpisodeSummary` → New: `EpisodeCanonical`
- Old: `EpisodeResponse` → New: `EpisodesPage`
- Controllers and services need updates

**Series Module:**

- Old: `SeriesResponse` → New: `MediaEntity`
- Old: Direct service types → New: Repository abstraction
- Controllers and services need updates

### Compatibility Notes

**Maintained Compatibility:**

- `SeriesRelationId` from `@scope/service/arm` (unchanged)
- `Instant` type from `@scope/common/utils` (unchanged)
- Service types (`NotifyAnime`, `JikanAnime`, etc.) (unchanged)

**New Dependencies:**

- `@scope/service/theme` for `AnimeTheme`
- `@scope/service/notify` for `Format`, `Source`, `Status`

## Files Modified

1. **`src/package/episodes/episodes.types.ts`** (~240 lines)
   - Added 13 new type definitions
   - Removed 2 legacy types
   - Comprehensive JSDoc documentation

2. **`src/package/series/series.types.ts`** (~190 lines)
   - Added 14 new type definitions
   - Removed 5 legacy types
   - Discriminated union implementation

## Validation

```bash
# Type checking passes
deno check src/package/episodes/episodes.types.ts
deno check src/package/series/series.types.ts

# Formatting consistent
deno fmt src/package/episodes/episodes.types.ts src/package/series/series.types.ts

# Linting clean
deno lint src/package/episodes/episodes.types.ts src/package/series/series.types.ts
```

**Results:**

- ✅ No type errors
- ✅ Formatting consistent
- ✅ Linting clean
- ✅ All types properly exported

## Type Coverage

### Episodes Module

- ✅ Core episode representation (`EpisodeCanonical`)
- ✅ Pagination types (`EpisodeCursor`, `EpisodesPage`)
- ✅ Filtering (`EpisodeFilters`, `EpisodeKind`)
- ✅ Storage (`EpisodeDocument`)
- ✅ Repository options (`EpisodesRepositoryOptions`)

### Series Module

- ✅ Media entities (`MediaUnion`, `MediaEntity`)
- ✅ Anime metadata (`AnimeMetadata`)
- ✅ Manga metadata (`MangaMetadata`)
- ✅ Series IDs (`SeriesId`)
- ✅ Titles (`SeriesTitle`)
- ✅ Images (`SeriesImageAttributes`, `SeriesCoverImage`)
- ✅ Networks (`SeriesNetwork`)
- ✅ Scheduling (`SeriesSchedule`, `SeriesScheduleEpisode`)
- ✅ Storage (`SeriesDocument`)

## Next Steps

### Todo #5: Port Episodes Module

1. Create `EpisodesRepository` using `Collection<EpisodeDocument>`
2. Implement TTL-based caching:
   - Airing series: 12 hours
   - Completed series: 7 days
3. Port source integrations:
   - Jikan (primary source)
   - Skyhook (season/episode mapping)
   - TMDB (images, runtime)
   - Trakt (optional)
4. Implement cursor-based pagination
5. Add filter support (kind, range, specials)
6. Write deterministic tests using `InMemoryCollection`

### Todo #6: Port Series Module

1. Create `SeriesRepository` using `Collection<SeriesDocument>`
2. Implement 48-hour TTL caching
3. Port service integrations:
   - ARM (ID resolution)
   - Jikan (anime/manga data)
   - Notify.moe (additional metadata)
   - Skyhook (TVDB data)
   - TMDB (images, scheduling)
   - Theme.moe (opening/ending songs)
   - Trakt (optional)
4. Feature flag for multi-source merging
5. Write tests with `InMemoryCollection`

## References

- [on-the-edge Episodes Types](https://github.com/AniTrend/on-the-edge/blob/main/src/episodes/episodes.types.ts)
- [on-the-edge Series Types](https://github.com/AniTrend/on-the-edge/blob/main/src/series/types.ts)
- [on-the-edge Episode Document](https://github.com/AniTrend/on-the-edge/blob/main/src/episodes/store/types.ts)
- [on-the-edge Media Document](https://github.com/AniTrend/on-the-edge/blob/main/src/series/local/types.ts)
- [Phase 1: Collection Implementation](./phase1-collection-implementation.md)
- [MongoDB Interface Design](./mongodb-interface-design.md)
