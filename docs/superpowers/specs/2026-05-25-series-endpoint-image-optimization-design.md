# Series Endpoint Image Optimization Design

## Goal

Reduce the `v1/series` response payload by returning a focused `images`
array that keeps only the most relevant images for Japanese and the client
device language, without changing the cached canonical series document.

## Current State

- `HeaderMiddleware` already requires `x-app-locale` and stores it in client
  attributes for each request.
- `SeriesController` currently passes only query params into `SeriesService`.
- `SeriesService` delegates to `SeriesRepository`, then returns the cached
  `SeriesDocument` as the API response shape.
- `seriesTransform()` currently maps every TMDB image into the response
  `images` array, which can produce a much larger payload than clients need.
- The repository cache is intentionally reusable across requests, so it should
  continue storing the full upstream image set.

## Design Summary

The optimization will happen only at the response boundary.

- Keep the repository and persisted `SeriesDocument` unchanged.
- Read the client locale from the current request context.
- Pass the locale into `SeriesService.aggregate()`.
- Filter the response `images` array after repository retrieval and before the
  response is returned to the client.
- Preserve the existing response schema: `images` remains
  `SeriesImageAttributes[]`.

This keeps caching reusable while making the API response locale-aware.

## Locale Rules

### Primary Locales

The response should prefer two locale buckets:

1. `jp`
2. The client device language derived from `x-app-locale`

Locale derivation is language-first:

- `en-US` becomes `en`
- `pt-BR` becomes `pt`
- `ja-JP` becomes `ja`

If the derived device language resolves to the same effective bucket already in
use, the response must not duplicate that bucket.

### Universal Images

TMDB images with `locale === null` are treated as universally acceptable.
These can satisfy either preferred bucket when no explicit locale match exists.

## Image Selection Rules

### Output Shape

The endpoint should return a reduced `images` array with, at most, one selected
image per preferred bucket and image type.

Image types remain:

- `POSTER`
- `BACKDROP`
- `LOGO`

For each image type, the response attempts to select:

1. The best `jp` image
2. The best device-language image

This means a type can contribute:

- two images when both preferred locale buckets are available
- one image when only one preferred bucket or a universal fallback is available
- zero images when no source images exist for that type

### Bucket Fallback Order

For each image type and preferred bucket, selection should follow this order:

1. Exact preferred locale bucket match
2. `locale === null`
3. Best remaining image regardless of locale, but only when neither preferred
   bucket can be satisfied by a locale-specific or universal image

This preserves enrichment while ensuring a type is still represented when TMDB
does not provide the preferred locales.

### Best Image Ranking

When more than one candidate can satisfy a bucket, rank candidates in this
order:

1. Locale-specific match beats universal (`null`) fallback
2. Universal (`null`) fallback beats unrelated locale fallback
3. Larger image area (`width * height`) beats smaller image area
4. Original source order is the final tie-breaker

This ranking keeps behavior deterministic and simple to test.

### Deduplication

The same image must not appear twice in the final `images` array.

Deduplication matters when:

- the device language bucket is already the same effective value as another
  preferred bucket
- a universal image satisfies the first bucket and would otherwise be selected
  again for the second bucket
- a best-available fallback candidate would duplicate an already chosen image

## Integration Plan

### Controller

`SeriesController` will gain access to request client attributes so it can pass
the locale to the service layer.

Responsibilities:

- read the current client locale from request context
- call `SeriesService.aggregate(query, locale)` or an equivalent locale-aware
  service signature

### Service

`SeriesService` will remain the response boundary for this optimization.

Responsibilities:

- keep query validation unchanged
- call `SeriesRepository.invoke(query)` unchanged
- apply focused image filtering to the returned entity before sending the
  response back to the controller

The service should only reshape the returned `images` field. No repository or
cache behavior changes are required.

### Selection Helper

Add a small focused helper inside the series package to keep the locale-aware
selection logic isolated and unit-testable.

Responsibilities:

- normalize the client locale into a language bucket
- group images by `type`
- select winners for `jp` and the device language buckets
- apply universal and best-available fallback rules
- deduplicate selected images while preserving deterministic output ordering

This helper should be pure and independent of Mongo or upstream services.

## Error Handling And Failure Behavior

- If request locale is unexpectedly missing, the response should still prefer
  `jp`, then universal images, then best available images.
- If a series has no images, the endpoint continues returning an empty `images`
  array.
- If a specific image type has no candidates, that type is simply absent from
  the reduced `images` array.
- No schema migration or cache invalidation is required.

## Testing Strategy

Add focused unit coverage for the selection helper and service integration.

### Helper Tests

Cover:

- locale normalization from values such as `en-US`
- `jp` plus device-language selection when both exist
- `null` locale acting as a universal fallback
- best-available fallback when neither preferred locale exists
- deduplication when a universal image could satisfy multiple buckets
- deterministic ranking by image size and source order
- no cross-type interference between `POSTER`, `BACKDROP`, and `LOGO`

### Service Or Controller Tests

Cover:

- locale-aware shaping happening after repository retrieval
- full repository document remaining unchanged before response shaping
- response schema staying identical except for the reduced image count

## Out Of Scope

- changing the MongoDB cache shape
- changing upstream TMDB fetch behavior
- introducing new API fields or versioned response contracts
- altering other series payload enrichment fields

## Acceptance Criteria

- `v1/series` returns a smaller `images` array focused on `jp` and the client
  device language.
- `x-app-locale` is interpreted language-first for the secondary bucket.
- `locale === null` images are treated as universal fallbacks.
- Best-available images are returned when preferred locales do not exist.
- Persisted cached series documents remain unchanged and reusable for later
  requests.
- The response schema remains backward-compatible.
