# Series AniList Fallback (Manga)

## What Changed

The `GET /v1/series` aggregation flow now includes an AniList fallback source when ARM does not return a mapping for a provided AniList ID.

New resolver behavior:

1. Attempt ARM relations lookup.
2. In parallel, query AniList by AniList ID.
3. Resolve MAL ID with this priority:
   - ARM `myanimelist`
   - query `mal`
   - AniList `idMal`
4. Fetch Jikan using media-aware routing:
   - AniList `type = MANGA` -> Jikan manga endpoint
   - otherwise -> Jikan anime endpoint

This allows manga entries to resolve when ARM returns `null` or is unavailable.

## Not-Found Semantics

Series aggregation now throws a domain not-found error when no meaningful upstream payload can be constructed after fallback attempts. The service maps that error to HTTP `404`.

Unexpected failures still map to HTTP `500`.

## Configuration

Add the AniList GraphQL endpoint in environment config:

- `ANILIST` (example: `https://graphql.anilist.co`)
