# Update Distribution and Client Targeting

This document describes how the edge serves Android application update metadata
to the AniTrend clients, how release sources are configured, how clients are
identified, and how update decisions are made. It is the reference for the
`/v1/update` endpoint, the `config/update-sources.yml` document, the canonical
client header contract, and the GrowthBook-driven AniTrend v2 promotion.

## 1. Architecture

The update system is split into four boundaries. They are deliberately kept
separate so that release discovery never decides update policy.

```
                    ┌──────────────────┐
                    │ GitHub Releases  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Release Source   │  (config/update-sources.yml)
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │Release Selector  │  (semver channel classification)
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Release Catalog  │  (UpdatesService + Mongo cache)
                    └────────┬─────────┘
                             │
                           Mongo
                             │
                             ▼

HTTP Request ──► Client Context ─────────────┐
                                             │
Release Catalog ─────────────────────────────┼──► Update Policy
                                             │
                                             └──► Update Decision

Client Context ──► GrowthBook ──► Config / Promotion Campaign
```

- **Release catalog** (`src/package/updates/` + `src/service/github/`) owns
  GitHub integration, release source configuration, release classification,
  version metadata, assets, caching, ETag handling and refresh. It never
  decides whether a client should update.
- **Client context** (`src/common/types/`, `src/middleware/header.middleware.ts`)
  owns the normalized, validated request identity. It is independent from
  release retrieval.
- **Update policy** (the decision logic in `UpdatesService`) consumes the
  release catalog and the client context and returns an update decision. It
  never calls GitHub directly.
- **Promotion policy** is GrowthBook configuration surfaced through the
  `/v1/config` endpoint. AniTrend v2 is a different application and package;
  it is never modeled as an update release for AniTrend App.

## 2. Release sources configuration

Release sources are configured in a version-controlled YAML document,
`config/update-sources.yml`. The document is embedded into the compiled edge
binary with `deno compile --include` and is the default configuration. The
`UPDATE_SOURCES` JSON environment variable is removed and must not be used.

### Schema

```yaml
schemaVersion: 1

products:
  <ANITREND_APP | ANITREND_V2>:
    repository: <owner>/<repo>
    version:
      propertiesPath: <path in the tagged repo>
    channels:
      <STABLE | BETA | EXPERIMENTAL>:
        selector:
          type: stable | prerelease
          # prerelease only, optional:
          identifiers:
            - beta
            - rc
        # optional, prerelease channels:
        rollingWindowDays: <int 1..3650>
        # optional:
        assets:
          preferred:
            - app-github-release.apk
```

Rules:

- `schemaVersion` must be `1`. A missing or newer version fails startup with a
  descriptive error; newer documents are never silently accepted.
- Duplicate YAML keys fail parsing (`@std/yaml` rejects them by default).
- Every `(product, channel)` pair must be unique.
- Repository, properties path and asset names are slug-validated so they cannot
  inject into constructed GitHub URLs.
- The YAML document is parsed with `@std/yaml` and then validated with a zod
  schema. Parsing alone is never trusted.

The embedded document is the default. An operator may override it with
`UPDATE_CONFIG_PATH` (see Deployment).

## 3. Release channels

`STABLE`, `BETA` and `EXPERIMENTAL` are genuinely distinct release streams,
classified by semantic version, not by age.

| Channel | Selector | Semantics |
| --- | --- | --- |
| `STABLE` | `type: stable` | GitHub releases where `draft == false` and `prerelease == false`. |
| `BETA` | `type: prerelease`, identifiers `beta`, `rc` | GitHub prereleases whose semver prerelease identifiers match a configured identifier. |
| `EXPERIMENTAL` | `type: prerelease`, identifiers `alpha`, `dev`, `experimental` | GitHub prereleases whose semver prerelease identifiers match a configured identifier. |

Notes:

- `rollingWindowDays` only bounds how old a candidate release may be. It never
  defines a channel. A prerelease younger than 90 days is not automatically a
  beta release.
- Draft releases never qualify for any channel.
- A GitHub prerelease whose tag cannot be parsed as semantic versioning is
  skipped and logged; one malformed tag never fails the whole refresh.
- Eligible releases are ordered by semantic version precedence (via
  `@std/semver`), with the publication timestamp as a secondary tie-breaker.
  Lexicographic string ordering is never used for version ordering.

### Release tag conventions

Tags must be valid semantic versions with an optional leading `v`.

```text
v1.14.0          -> STABLE
v1.15.0-beta.1   -> BETA
v1.15.0-rc.1     -> BETA
v1.16.0-alpha.1  -> EXPERIMENTAL
v1.16.0-dev.5    -> EXPERIMENTAL
nightly-latest   -> never qualifies (not semver)
```

## 4. version.properties requirements

For Android applications the tagged `gradle/version.properties` document is the
authoritative source of both `version` and `code`. It must contain at least:

```properties
version=1.13.0
code=1013000000
name=v1.13.0
```

`parseVersionProperties` tolerates comments, blank lines, whitespace and case
variations. Keys recognized: `VERSION`/`VERSION_NAME`, `CODE`/`VERSION_CODE`,
`NAME`/`APP_NAME`.

Rules:

- Android `versionCode` is never fabricated from the semantic version. The old
  `major * 1_000_000_000 + minor * 1_000_000 + patch * 1_000` fallback is
  removed.
- A candidate release that lacks `version.properties` at its tag, or whose
  document is missing/invalid `version` or `code`, is rejected. The previously
  cached valid record is retained.
- A source without a configured `propertiesPath` cannot resolve a version code
  and its candidates are rejected.

## 5. Caching and refresh

MongoDB stores one record per `(product, channel)` in the `updates` collection.
Each record carries the release, the fetch time, the GitHub ETag, and a
`policyFingerprint` (SHA-256 of the canonical source policy).

- Fresh records are served without any upstream call.
- Stale records (older than 12 hours) trigger a source-scoped refresh on the
  request path, throttled per source by a 5 minute cooldown.
- Refresh is single-flight per `(product, channel)`: concurrent callers await
  the same in-flight GitHub operation. Different sources refresh independently.
- The scheduled refresh uses bounded concurrency (3 sources at a time).

### ETag and policy invalidation

A GitHub `304 Not Modified` is only accepted as proof that the cached selection
is still valid when:

1. the persisted `policyFingerprint` matches the current source policy
   (repository, properties path, selector, identifiers, rolling window, asset
   rules), and
2. the cached candidate is still eligible under time-dependent local policy
   (for example it has not aged out of its `rollingWindowDays`).

If either check fails the cached ETag is not trusted: a full unconditional
re-fetch and re-selection happens, and the aged-out or policy-invalid record is
never marked fresh. Asset-policy changes are honored at the response boundary
immediately, without waiting for another GitHub release.

## 6. Update endpoint and decisions

```http
GET /v1/update?channel=STABLE
```

- The update product is derived from the validated client context
  (`ClientContext.appId`), never from a caller-controlled default.
- `channel` remains request-selectable.
- During the compatibility period a `product` query parameter is accepted only
  when it matches the derived product; a mismatch returns `400 Bad Request`.
  Cross-product selection via query parameter is rejected.
- A requested `(product, channel)` with no configured source returns
  `UNSUPPORTED`; there is no silent fallback to stable.

The response is an update decision:

```json
{ "status": "UP_TO_DATE" }
{ "status": "UPDATE_AVAILABLE", "release": { "...": "..." } }
{ "status": "UNSUPPORTED" }
```

The decision compares the client version code (`x-app-code`) against the cached
release code: lower client code means `UPDATE_AVAILABLE`; equal or higher means
`UP_TO_DATE`. Downgrades are never offered.

## 7. Client header contract

The `HeaderMiddleware` parses and strongly validates the canonical client
headers into a `ClientContext` before any route runs (except `/v1/health`).
These are client-supplied targeting metadata, not authentication, and must
never be used to authorize privileged operations.

| Header | Meaning | Validation |
| --- | --- | --- |
| `x-app-id` | Machine-readable product identity: `ANITREND_APP` or `ANITREND_V2` | Known enum value |
| `x-app-package` | Android `applicationId` (e.g. `co.anitrend`) | Non-empty, <= 255 chars |
| `x-app-version` | Application version name | Non-empty, <= 64 chars |
| `x-app-code` | Android `versionCode` | Positive integer |
| `x-app-source` | Distribution source (installer) | Non-empty, <= 64 chars |
| `x-app-locale` | Locale tag | <= 32 chars |
| `x-app-build-type` | Build type (`debug`, `release`, ...) | Non-empty, <= 32 chars |
| `x-device-build-id` | Android system `Build.ID` | <= 128 chars, null when empty |

Behavior:

- A missing required header or an invalid value throws `ForbiddenException` in
  production (warned in development).
- `x-app-name` (the Android application label) is no longer product identity.
- `x-app-build` (which previously carried Android `Build.ID`) is renamed to
  `x-device-build-id`. The value is device metadata, never application build
  metadata.
- All values are bounded so unbounded client strings cannot reach GrowthBook
  targeting attributes.

## 8. GrowthBook promotion

AniTrend v2 is a different application and package. It is never treated as an
update release for AniTrend App. Promotion of AniTrend v2 is a
GrowthBook-controlled campaign surfaced through the `/v1/config` endpoint.

- Feature key: `anitrend-v2-promotion`. The feature value carries the payload
  (`id`, `targetProduct`, `title`, `message`, `action: { type: "OPEN_URL",
  url }`). The UI wording is operational configuration in GrowthBook, not
  hard-coded in this repository.
- The server only applies coarse eligibility: the feature is on with a payload,
  the client is an AniTrend App release build, and the client is not AniTrend
  v2 (no self-promotion). Finer rollout targeting (minimum version code,
  percentages) is GrowthBook's job.
- Turning the feature off stops promotion payloads immediately, without a
  client release.
- Clients own local presentation state (dismissed, last displayed, never show
  again); the server decides eligibility only.

## 9. Deployment

Environment variables:

| Variable | Purpose |
| --- | --- |
| `UPDATE_CONFIG_PATH` | Optional absolute path to an external `update-sources.yml`. Absent -> embedded default; present and readable -> external; present but unreadable or malformed -> startup failure (no silent fallback). |
| `UPDATES_REFRESH_INTERVAL_HOURS` | Scheduled refresh cadence in whole hours, `1..12`; invalid values fall back to `6`. |
| `GITHUB_TOKEN` | Optional GitHub personal access token. When set it is sent as `Authorization: Bearer` on `api.github.com` requests only (never to `raw.githubusercontent.com`). It is never logged. |

GitHub API requests always send `Accept: application/vnd.github+json` and
`X-GitHub-Api-Version: 2022-11-28`. Rate-limit response metadata
(`x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`) is captured
and logged at debug level.

The embedded configuration is compiled into the binary
(`deno compile --include config/update-sources.yml`); the Dockerfile removes
the source tree, so production must not assume the file exists on disk.

## 10. Failure and stale-cache behavior

- GitHub failures (network, timeout, malformed payload, rate limiting) return
  no release and never erase a valid cached record.
- A configured source with no cached record after a failed refresh returns
  `404 Not Found`.
- A stale cached record is served as a fallback after a failed refresh, with a
  warning logged.
- A `304 Not Modified` never renews the freshness of a record that has aged out
  of local policy or whose policy fingerprint changed.
- GitHub is the release source; the edge is not an artifact host.

## 11. Observability

Structured logging covers source refresh start/completion/failure, release
selected/rejected, channel classification, 304 received, 304 rejected due to
local policy, policy fingerprint changed, stale fallback served, GitHub
rate-limit state, and update decisions. Tokens, the `Authorization` header and
personally identifying request data are never logged. Ordinary successful
update requests are logged at debug level to avoid noise.

## 12. Public contract notes

The OpenAPI contract is generated from `*.contract.ts` and validated by
`deno task swagger:generate` + `deno task swagger:validate` (CI requires
MongoDB/Redis). Schema titles are registered in
`src/common/openapi/names.ts`. Public changes must update the Zod contract, the
swagger wrapper, the expected schema names, regenerate and validate the OpenAPI
document, and keep GraphQL Mesh compatibility. The `product` query parameter is
kept during the compatibility period and must match the derived product.
