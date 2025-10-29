# Phase 5: Multi-source Episode Aggregation (Enablement & API Stability)

Status: Proposed
Owner: Episodes package
Last updated: 2025-10-17

## Why

We currently resolve episodes from a single primary source (Jikan) and store merged episodes in cache. The merge algorithm (Phase 4) and repository API surface are ready for multi-source data, but only the Jikan slice is wired. Phase 5 enables additional sources behind feature flags while preserving a stable external API (EpisodeCanonical[] with cursor pagination).

## Current state (baseline)

- Resolver (`EpisodesResolver`) fetches a Jikan slice and returns `MergeResult`.
- Merge algorithm (`aggregator/merge.ts`) supports multi-slice merging, conflict detection, and stats.
- Repository stores `MergedEpisode[]` internally but strips merge metadata when returning API results.
- EpisodeSourceSlice now includes `remapped: number` (for XEM remapping count per slice).
- Module wiring: `EpisodeModule` imports `ServiceModule` exposing all external services.

## Goals (Phase 5)

1. Add secondary sources under feature flags:
   - Skyhook (TVDB)
   - TMDB
   - Trakt
   - Notify
   - Theme (AnimeThemes)
2. Keep API contract unchanged by default:
   - Controller/Service returns `EpisodesContainer` with `EpisodeCanonical[]` only.
3. Provide diagnostics optionally (opt-in):
   - Merge stats, sources, remapped count, cached flag, updatedAt.
4. Keep caching semantics and TTL unchanged; only content differences when features are enabled.
5. Deterministic offline tests with mocked services.

## Non-goals

- No public API shape changes by default (no merge metadata in the response).
- No outbound network in tests; no live integration tests in this phase.

## Feature flags

Suggested GrowthBook-style flags (names can map to your feature provider):

- enable-skyhook-source
- enable-tmdb-source
- enable-trakt-source
- enable-notify-source
- enable-theme-source
- enable-episodes-diagnostics (allows returning optional diagnostics)
- enable-title-fuzzy-match (guards `titleSimThreshold` usage)

Default OFF in production; tests enable flags explicitly.

## Resolver design updates

`EpisodesResolver.resolve(malId, seriesKey): Promise<MergeResult>`

- Existing Jikan slice stays primary.
- Add private fetchers returning `EpisodeSourceSlice | null`:
  - fetchSkyhookSlice(...)
  - fetchTmdbSlice(...)
  - fetchTraktSlice(...)
  - fetchNotifySlice(...)
  - fetchThemesSlice(...)
- Each fetcher:
  - Produces normalized `EpisodeCanonical[]` for that source (light transformer if needed).
  - Returns `{ source: 'SKYHOOK' | 'TMDB' | 'TRAKT' | 'NOTIFY' | 'THEMES', episodes, remapped }`.
  - returns `null` if feature flag disabled or data unavailable.
- Merge configuration (`MergeContext`):
  - `preferRuntime: 'JIKAN'` (unchanged)
  - `titleSimThreshold`: number | null; gated by `enable-title-fuzzy-match` (e.g. 0.72).
- Optional: call TheXem to build mappings and compute `remapped` count per slice; normalization can be a follow-up if not ready.

## Merge rules (recap)

- Index primary (Jikan) by number; attempt to match secondary episodes by:
  - Direct number match
  - Air date proximity (±2 days)
  - Fuzzy title (Dice) if threshold enabled
- Track conflicts: TITLE, DURATION, AIR_DATE; mark ORPHAN when unmatched.
- Enrich missing fields from secondary sources (prefer non-null values). Source priority may be applied when conflicts arise.
- Sort by alignment number.

## Repository behavior (unchanged externally)

- On cache miss, use resolver to get `MergeResult`.
- Persist `MergedEpisode[]`; TTL based on `deriveAiringStatus()`.
- When returning to API callers, strip `{ sources, conflictReasons, alignmentKey }`.
- If `enable-episodes-diagnostics`, append a diagnostics block to the response (non-breaking optional field in service layer; controller can gate exposure):
  - `sources: string[]`
  - `mergeStats: { conflicts: number, orphans: number, total: number, ... }`
  - `cached: boolean`
  - `updatedAt: Instant`

## API contract

- Request: unchanged (`EpisodeQuery`) with cursor pagination params.
- Response: `EpisodesContainer` unchanged by default.
- Optional diagnostics are added by the service when the diagnostics feature is enabled (e.g., extend service return type as internal-only; controller may expose via `?diagnostics=true` and feature flag).

## Security & configuration

- Secrets/config for third-party services must come from `SecretService` and existing service adapters (no hard-coded values).
- Do not log PII or full payloads; structured logs OK for counts/ids and merge stats.

## Error handling & fallback

- If any secondary fetch fails or returns invalid data:
  - Log at warn/error (throttled at info level in resolver),
  - Continue with remaining sources,
  - Always return at least Jikan-only result.

## Testing plan

- Unit tests (resolver):
  - Each fetcher returns a small slice; enabled/disabled by flags.
  - Merge:
    - Direct number match, date proximity, and fuzzy title threshold path.
    - Conflict detection (TITLE/DURATION/AIR_DATE).
    - Orphans tracked when unmatched.
  - XEM remap accounting increments `remapped` (can stub as constants).
- Integration tests (repository):
  - Diagnostics opt-in off by default; on when flag set.
  - Cache miss → persist merged episodes; subsequent call uses cache.
  - Filters and cursor invariants remain correct with enriched data.
- Deterministic: use in-memory collection, mocked services, and fixed timestamps.

## Acceptance criteria

- Feature-flagged sources enrich episodes without breaking the public response shape.
- When all flags OFF, behavior identical to Jikan-only baseline.
- When flags ON, repository still returns `EpisodeCanonical[]` with correct total, cursors, and filters.
- Conflicts and orphans counted; remapped count available in slices (even if stubbed 0 initially).
- Diagnostics block only present when explicitly enabled.
- All existing tests pass; add targeted tests for multi-source paths.
- Lint/format clean; no new external network calls in tests.

## Rollout plan

1. Land resolver fetchers behind flags with tests (flags OFF by default).
2. Add diagnostics opt-in path; guard behind `enable-episodes-diagnostics`.
3. (Optional) Introduce gradual enablement per environment via feature provider.
4. Observe logs for conflicts/orphans and performance.

## Implementation notes

- Keep transformers small and colocated with resolver for now; if they grow, move to `src/package/episodes/transformer/*` per source.
- Prefer reusing existing service clients under `@scope/service/*` and handle small, focused DTO transformations.
- Keep metadata stripping confined to repository to protect API contract.
- Maintain single source of truth for enums/types via `episodes.schema.ts` inference.
