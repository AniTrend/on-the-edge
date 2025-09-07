# Jikan Service Module

This module provides access to a subset of the **Jikan v4** API focused only on:

* `GET /anime/{id}` + `GET /anime/{id}/moreinfo`
* `GET /manga/{id}` + `GET /manga/{id}/moreinfo`

The goal is to materialize a unified domain model (`JikanAnime` / `JikanManga`) that merges the primary resource payload with the optional `moreinfo` text. The `moreinfo` field is fetched via a secondary call and appended (null-safe) during transformation.

## Type Layers

1. Remote resource types (`AnimeResource`, `MangaResource`) represent the raw payload returned by the core endpoints. These now include expanded coverage: titles, images (jpg/webp), trailer (with optional image variants), aired/published period, broadcast (anime), producers/licensors/studios, authors/serializations (manga), genres, explicit_genres, themes, demographics and an optional `moreinfo` aggregation field.
2. Domain types (`JikanAnime`, `JikanManga`) extend the remote resource and guarantee the presence of the `moreinfo` key (as `string | null`) post-transform.

```mermaid
flowchart LR
  A[GET /anime/{id}] --> C[Aggregate]
  B[GET /anime/{id}/moreinfo] --> C
  C --> D[animeTransform]
  D --> E[JikanAnime]
```

## Transformation

`animeTransform` / `mangaTransform` are intentionally shallow; they copy the resource and coerce `moreinfo` to `null` if absent. Any enrichment logic (e.g. combining synopsis & moreinfo) happens at higher-level transformers (see `series.transformer.ts`).

## Testing Strategy

Focused unit tests (`jikan.service.test.ts`, `jikan.manga.transformer.test.ts`) assert the preservation of `moreinfo`. Broader integration behavior (concatenating into series description) is validated in the series transformer tests.

## Future Extensions

* Add light validation against the bundled JSON schema fixtures.
* Support pagination for related endpoints if needed.
* Normalise `titles` into a map keyed by type for faster lookups.

---
Generated as part of the Jikan type model rewrite.
