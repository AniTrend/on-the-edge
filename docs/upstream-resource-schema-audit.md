# Upstream resource schema audit

**Evidence snapshot:** 2026-10-24. This report records provider contracts and
selected live samples, then identifies pre-fix assumptions at repository revision
`e6c595ed846464bcddabf74adf4eada23379ea68` that need care. It is not a claim
that every provider conforms to one universal
schema, nor that all listed implementation work or validation is complete.

## Scope and evidence labels

The audit covers the ten upstream integrations under `src/service/`: Jikan,
TMDB, Trakt, Skyhook, Notify, ARM, AnimeThemes, TheXem, Otakumode RSS, and
GitHub Releases. The shared downstream consumers include series and episode
resolution, Jikan people/studio/character data, RSS news, and GitHub updates.
Telemetry and outbound WebPush are not upstream metadata resources and are out
of scope.

- **Observed** means directly stated in the cited contract/source or seen in
  the specific live sample described. A sample only demonstrates that sample.
- **Inferred** means a likely compatibility risk derived from a documented
  contract and the local parser or consumer. It does not prove the provider
  emits the problematic value.
- **Unknown** marks behavior not established by the available contract or
  sample. Absence of a field in one sample is not evidence that it is always
  absent.

Provider contracts, pinned source revisions, and live observations are kept
distinct below. The linked API documents describe contracts; pinned repository
links identify source snapshots; live URLs identify individual probes. No
credentialed live sample was available for TMDB or Trakt. The Notify source
repository has moved and its current host did not resolve during this audit.

## Provider findings

### Jikan

**Local resources:** `src/service/jikan/jikan.schema.ts`, `jikan.service.ts`, and
`transformer/`.

**Resources:** Anime full/base/more-info and episodes, people/producer/character
detail and search, and character full are consumed. Manga full/base/more-info
and staff methods are supported but have no production caller. Other declared
fetch options are unused.

**Observed, contract:** [Jikan API docs](https://docs.api.jikan.moe/) and the
[pinned OpenAPI document at `1e33a79`](https://github.com/jikan-me/jikan-rest/blob/1e33a79bcc9161f1831e4428004e110c67a48676/storage/api-docs/api-docs.json)
identify OpenAPI 3.0.0 / API info 4.0.0. This does not establish the deployed
server version; the latest listed release at audit time was 4.2.4
(2024-11-09). The contract describes unavailable scalars as `null`,
arrays/objects as empty, unknown scores as `0`, a limit of 3 requests/second
and 60/minute, and a 24-hour cache. The pinned PHP resources are under
[`app/Http/Resources/V4`](https://github.com/jikan-me/jikan-rest/tree/1e33a79bcc9161f1831e4428004e110c67a48676/app/Http/Resources/V4).

**Observed, local mismatch:** Anime type/status/source and broadcast child
nullability differ; reference strings such as source/entity values are locally
enums. Manga OEL is absent locally, themes are stripped, and the base spec
omits synonyms although the PHP resource emits them. Numeric/boolean coercion
can accept wrong JSON types (`"false"` becomes true); date transforms can
become non-finite; normalized episode seconds are divided by 1000 again
downstream.

**Unknown:** Two timed-out GETs for anime 1/full did not provide malformed-200
evidence. Existing non-429 full/base fallback, optional metadata, and partial
pagination behavior must remain intact.

### TMDB

**Local resources:** `src/service/tmdb/tmdb.schema.ts`, `tmdb.service.ts`, and
`utils/tmdb.image-provider.ts`.

**Resources:** Configuration, TV/movie/season resources, and appended image
data are consumed by the integration.

**Observed, contract:** [TMDB OpenAPI](https://developer.themoviedb.org/openapi/tmdb-api.json),
retrieved 2026-10-24, reports OpenAPI 3.1.0 and Last-Modified 2026-03-23. The
[movie details reference](https://developer.themoviedb.org/reference/movie-details)
describes movie details. Movie payloads use `title`, while the local shared
base requires `name`. `known_for_department` is an open string in the provider
contract but locally caught by an enum. Empty configuration image-size lists
and finite-date handling are useful regression cases, not proof that TMDB
violates its contract.

**Unknown:** Configuration size behavior has not been established by a live
credentialed response. The provider's empty `required` lists do not by
themselves establish that every field is optional in all responses. No live
credentialed sample was available.

### Trakt

**Local resources:** `src/service/trakt/trakt.schema.ts` and
`trakt.service.ts`.

**Resources:** Full shows and seasons with `extended=episodes` are consumed.
The full-season method is supported but has no production caller.

**Observed, contract/source:** The maintained [Trakt API documentation](https://trakt.docs.apiary.io/)
and [trakt/trakt-api source snapshot `dab7797`](https://github.com/trakt/trakt-api/tree/dab7797de4e30bdd3fa0f98c0f8b5d8509845991/projects/api/src/contracts)
(2026-10-21) are the reference points. The pinned
[show](https://github.com/trakt/trakt-api/blob/dab7797de4e30bdd3fa0f98c0f8b5d8509845991/projects/api/src/contracts/_internal/response/showResponseSchema.ts)
and [episode](https://github.com/trakt/trakt-api/blob/dab7797de4e30bdd3fa0f98c0f8b5d8509845991/projects/api/src/contracts/_internal/response/episodeResponseSchema.ts)
schemas allow nullable, optional `first_aired` and `updated_at`. The
[season schema](https://github.com/trakt/trakt-api/blob/dab7797de4e30bdd3fa0f98c0f8b5d8509845991/projects/api/src/contracts/shows/schema/response/seasonResponseSchema.ts)
makes `updated_at` nullable and optional, but `first_aired` optional, not nullable.
Local required/coerced fields include
overview, dates, ratings, counts, genres, and `available_translations`, where
null/absence can lead to invalid numeric values. Route text requests episodes,
while the response schema omits them, a source inconsistency.

**Unknown:** That inconsistency does not prove episodes are absent from
responses. No credentialed response sample was available.

### Skyhook

**Local resources:** `src/service/skyhook/skyhook.schema.ts` and
`skyhook.service.ts`.

**Resources:** The TVDB show endpoint is consumed.

**Observed, live sample:**
[`/v1/tvdb/shows/en/81189`](https://skyhook.sonarr.tv/v1/tvdb/shows/en/81189)
returned a 200 response with string `rating.value` and empty ID arrays; those
shapes align with the local schema.

**Unknown:** A full v1 contract and its nullability rules were not established.
The available [Sonarr source snapshot `b3d4bb8`](https://github.com/Sonarr/Sonarr/tree/b3d4bb8c18f7feb6744a6cd3231279a45351bb5e)
describes v2 and decimal ratings. Do not apply its v2 assumptions to the v1
endpoint.

### Notify

**Local resources:** `src/service/notify/notify.schema.ts`,
`notify.service.ts`, and `transformer/`.

**Resources:** Anime and episode resources are consumed.

**Observed, archived source:** [Notify source at `fb73dba`](https://github.com/animenotifier/notify.moe/tree/fb73dba780667774294bd621b580bb247d635288),
including [`arn/HSLColor.go`](https://github.com/animenotifier/notify.moe/blob/fb73dba780667774294bd621b580bb247d635288/arn/HSLColor.go),
normalizes HSL components to 0..1, unlike the local degree/percent
interpretation. For example, `(0.5, 0.5, 0.5)` should yield `#40bfbf`. The
archived Anime data includes empty dates, which become local `NaN`;
non-numeric Shoboi map values also become `NaN` through `Number`.

**Unknown:** The source moved, `git.akyoto.dev` did not resolve during this
audit, and no live response or current contract was established. Confidence is
limited to the archived snapshot.

### ARM

**Local resources:** `src/service/arm/arm.schema.ts` and `arm.service.ts`.

**Resources:** AniList and MyAnimeList ID lookup is consumed; no-match responses
can be `null`. `/thetvdb`, `/themoviedb`, and `/imdb` wrappers are unused.

**Observed, contract:** [ARM API docs](https://arm.haglund.dev/docs) identify
API 2.1.0; the [pinned OpenAPI file at `c5415db`](https://github.com/beeequeue/arm-server/blob/c5415db1ce4c262142c73cf07e6970982b286048/docs/openapi.yaml)
is the source reference. **Observed, live sample:**
`/api/v2/ids?source=anilist&id=300` returned a valid object. An empty `{}`
schema has no required properties, so it does not prove that an all-null object
violates the contract. The spec permits nullable array entries. The IMDb
request is typed as an integer in the specification but uses `tt`-style
strings locally.

**Unknown:** The operational impact of the IMDb request-type discrepancy is
not established.

### AnimeThemes

**Local resources:** `src/service/animethemes/animethemes.schema.ts` and
`animethemes.service.ts`.

**Resources:** Anime lookup by MAL ID is consumed, filtered to theme
entries/videos/audio and songs.

**Observed, live sample:** `/anime` for MAL 37521 with
`include=animethemes.animethemeentries.videos.audio,animethemes.song` worked.
**Observed, documentation:** The [pinned API docs at `829a5bb`](https://github.com/AnimeThemes/animethemes-api-docs/tree/829a5bbe3097a425da6dc181a363098a9eb3a488)
do not document the used `filter[site]` or `filter[external_id]` parameters.
`page[size]=1` can return one item when multiple matches exist; there is no
established requirement to expand pagination.

**Unknown:** Exhaustive OP/ED coverage is not established.

### TheXem

**Local resources:** `src/service/thexem/thexem.schema.ts` and
`thexem.service.ts`.

**Resources:** Mapping lookup by origin and ID is consumed.

**Observed, contract/sample:** [TheXem docs](https://thexem.info/doc) and the
[live TVDB mapping query](https://thexem.info/map/all?origin=tvdb&id=73141)
are references; the query returned scene/TVDB rows without AniDB IDs, while
the local schema requires one. Missing `data` on failure defaults to `[]` and
is accepted/cached for 24 hours; an unknown ID can return failure with
`data: []`.

**Unknown:** A complete error/response contract was not established. The
consumer of a suffixed `tvdb_2` origin is also unknown.

### Otakumode RSS

**Local resources:** `src/service/otakumode/otakumode.schema.ts` and
`otakumode.service.ts`.

**Resources:** The configured news feed is consumed.

**Observed, live sample:** [Otakumode feed](https://otakumode.com/news/feed)
returned 10 valid items and ETag `W/"30073-1KYDoEWVBEcXRllt93PGSLeJnLU"`.
[RSS 2.0.11](https://www.rssboard.org/rss-specification) allows any number of
items. With locked `xml` 8 and `std/xml` 0.1.3, singleton-object output fails
the local array schema: deterministic probes with 0 and 2 items passed, while
1 item failed. Invalid `pubDate` or dimensions can become `NaN`.

**Unknown:** The producer's full schema is unavailable; do not infer that
every RSS field should be optional.

### GitHub Releases

**Local resources:** `src/service/github/github.schema.ts` and
`github.service.ts`.

**Resources:** Releases from the configured repository are consumed,
including tagged `gradle/version.properties` metadata.

**Observed, contract:** [GitHub REST release listing](https://docs.github.com/en/rest/releases/releases#list-releases)
documents `GET /repos/{owner}/{repo}/releases?per_page=100` (API version
`2022-11-28`). **Observed, live data:** A visible draft release with
`published_at: null` can fail parsing before draft filtering, rejecting the
whole list. Nullable body and individual asset members are already handled;
this does not imply that an `assets: null` collection is valid. A tagged raw
`gradle/version.properties` sample from [AniTrend/anitrend-app commit `711df63`](https://github.com/AniTrend/anitrend-app/tree/711df6391aa695b2bab722bf2f4289dc6e624a8b)
parsed version `1.13.0` and code `1013000000`.

**Unknown:** Pagination beyond 100 has no demonstrated requirement.

## Regression and compatibility checks

The subsequent [public live assessment](upstream-live-assessment.md) records
actual request results and isolated actual-service replays, including blocked
providers. It does not turn the offline suite into universal live proof.

### Implementation disposition

The changes accompanying this audit address the following boundaries without
changing public contract schemas:

| Provider      | Correction                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| Jikan         | Resource-specific nullability, strict primitive inputs, finite dates, anime/manga narrowing, and episode units |
| TMDB          | Movie title versus TV name, and open crew-department strings                                                   |
| Trakt         | Resource-specific optional/null metadata and finite date normalization                                         |
| Skyhook       | Invalid-date guards for the consumed v1 representation                                                         |
| Notify        | Archived normalized HSL units and finite optional dates                                                        |
| TheXem        | Optional omitted AniDB mapping and success-only caching                                                        |
| Otakumode RSS | Singleton item normalization, finite dimensions, and per-item publication-date rejection                       |
| GitHub        | Draft filtering before publication-dependent validation                                                        |
| ARM           | Audited; no evidenced production mismatch requiring a change                                                   |
| AnimeThemes   | Audited; no evidenced production mismatch requiring a change                                                   |

Focused regressions and integrated checks support these bounded corrections;
the table does not certify every possible upstream response.

### Validation results

**Observed:** Formatting, lint, entrypoint type checking, the full test task,
compilation, and Swagger generation/validation passed. After correcting the
review-discovered TMDB optional-date discriminator, type checking, full tests,
and compilation passed again: **126 tests, 522 steps, zero failures, four
ignored tests**. Both delivery reviews passed using Oracle as the fallback
because the Architect agent was unavailable. Public contract schemas were not
changed.

Commands: `deno fmt --check`, `deno lint`, `deno task check`,
`deno task test`, `deno task build`, `deno task swagger:generate`, and
`deno task swagger:validate`. Swagger generation used `CI=true` and explicit
local MongoDB/Redis endpoints. It logged MongoDB index-authentication warnings
but generated a contract that passed validation; this does not establish full
database operational readiness.

**Validation limit:** Local Deno was 2.8.0; CI pins 2.9.7. The checks therefore
do not establish exact CI-version equivalence. Live Jikan requests timed out,
TMDB/Trakt lacked credentialed samples, Notify evidence is archived, and
Skyhook v1 lacks a complete formal contract. Historical cached documents were
not migrated or revalidated.

Validation work is tracked in tests. The cases below capture boundaries exposed
by the evidence, including follow-up checks where documentation remains
incomplete. They do not claim exhaustive coverage of upstream variants.

- Exercise documented absent, `null`, empty, and zero values separately. Do
  not equate a missing field with an empty collection or a numeric zero.
- Reject or deliberately normalize wrong JSON types without producing
  non-finite values. Include numeric/boolean coercion and invalid date cases;
  verify Jikan episode units are converted exactly once.
- Keep Jikan's existing non-429 full/base fallback, optional metadata, and
  partial-pagination behavior while testing malformed success payloads.
- Test TMDB movie `title` separately from TV `name`, open provider strings,
  empty image configuration values, and finite date output.
- Test Trakt null/omitted metadata and the requested `extended=episodes`
  response boundary without asserting that undocumented episode fields are
  always absent.
- Keep Skyhook tests scoped to the consumed v1 shape, including string rating
  values and empty ID arrays. Do not use v2 assumptions as a v1 oracle.
- Test Notify HSL conversion, empty dates, and non-numeric map entries against
  the archived evidence, while keeping current upstream behavior marked
  unknown.
- Test ARM's valid lookup and no-match `null`, and avoid rejecting `{}` solely
  because it has no fields when the schema declares none required.
- Test AnimeThemes filters and bounded pagination independently; do not claim
  exhaustive OP/ED results from one successful lookup.
- Test TheXem rows without AniDB IDs, failure responses with empty data, and
  the existing fallback/cache boundary. Keep the unresolved `tvdb_2` origin
  separate from confirmed provider behavior.
- Test RSS parsing for zero, one, and multiple items, plus invalid dates and
  dimensions. Keep the test tied to the locked parser versions and the
  observed singleton shape.
- Test that a draft GitHub release with null `published_at` does not prevent
  valid published releases from being processed; retain nullable body/assets
  handling and the tagged version-file parse.

Provider-boundary corrections must preserve the public normalized resource
shapes and existing graceful fallbacks unless a separately reviewed public
compatibility change is intended. Do not weaken a shared schema globally to
accommodate one provider's uncertain sample. Prefer handling documented
provider variance at the provider boundary and retain strict checks for
invariants required by downstream consumers.

Cached normalized data is not raw upstream evidence and is not certified by a
fresh provider-boundary fix. This audit makes no cache migration claim and does
not authorize changing cache identity, TTL, or stored/public schema. Confirm
the cache behavior separately before treating previously normalized values as
revalidated.
