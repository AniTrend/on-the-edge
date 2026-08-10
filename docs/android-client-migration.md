# Android Client Header Migration

The edge service now expects a canonical, validated client header contract (see
`docs/update-system.md`, section 7). This document records the concrete changes
required in the Android clients so they can satisfy the contract. The changes
belong in the Android repositories (`AniTrend/anitrend-v2`,
`AniTrend/anitrend-app`) as separate issues/PRs; they are deliberately not
bundled into `on-the-edge`.

## Required header contract

The edge requires these headers on every request (except `/v1/health`), with
strict value validation in production:

| Header | Source value in the client |
| --- | --- |
| `x-app-id` | Stable product identity: `ANITREND_V2` or `ANITREND_APP` |
| `x-app-package` | Android `applicationId` |
| `x-app-version` | `versionName` |
| `x-app-code` | `versionCode` (positive integer) |
| `x-app-source` | Distribution source (installer package) |
| `x-app-locale` | Locale tag |
| `x-app-build-type` | Build type (`debug`, `release`, ...) |
| `x-device-build-id` | Android system `Build.ID` |

Notes:

- `x-app-name` (the localized application label) is no longer required and is
  not product identity.
- `x-app-build` is renamed to `x-device-build-id`; its value stays Android
  `Build.ID` and is device metadata, not application build metadata.
- The edge rejects invalid values in production, so clients must send valid
  values before shipping against the new contract.

## AniTrend v2

Repository: `AniTrend/anitrend-v2` (applicationId `co.anitrend`, flavors
`google`/`github`).

Current header provider:

- `data/core/src/main/kotlin/co/anitrend/data/android/network/interceptor/app/AppInterceptor.kt`
  sends `x-app-name`, `x-app-version`, `x-app-build`, `x-app-code`,
  `x-app-source`, `x-app-locale`, `x-app-build-type`, and echoes `x-request-id`.
- `data/core/src/main/kotlin/co/anitrend/data/core/app/IAppInfo.kt` +
  `data/core/src/main/kotlin/co/anitrend/data/android/info/AppInfo.kt` supply
  the values. `build` currently returns `Build.ID`; `label` returns the
  localized application label.

Required changes:

1. Add `x-app-id` with the constant value `ANITREND_V2`. Recommended: expose it
   on `IAppInfo`/`AppInfo` (or a constant in `AppInterceptor`) so it cannot
   drift.
2. Add `x-app-package` with the application id. Prefer a BuildConfig field or
   `context.packageName` over a hard-coded string.
3. Rename the `x-app-build` header to `x-device-build-id` and keep sending
   `Build.ID` as its value. Rename the corresponding `IAppInfo` property (for
   example `build` -> `deviceBuildId`) so the semantics are explicit.
4. Keep `x-app-build-type` (`co.anitrend.data.core.BuildConfig.BUILD_TYPE`,
   `debug`/`release`). If a `benchmark` build type is ever used, ensure it is a
   distinct value.
5. `x-app-name` may be dropped from `AppInterceptor`. If kept, it is a display
   label only and must not be treated as identity by any client code.
6. Keep `x-app-version`, `x-app-code`, `x-app-source`, `x-app-locale` as-is
   (their values already match the contract: `PackageInfo.versionName`,
   `PackageInfo.longVersionCode`, installer package, `Locale` tag).

Validation before shipping: run the app against a build of the edge that
enforces the contract and confirm all requests carry valid values.

## AniTrend App

Repository: `AniTrend/anitrend-app` (applicationId `com.mxt.anitrend`, flavors
`app`/`github`).

Current state (independently inspected):

- The app does not send any `x-app-*` headers today and its GraphQL API is
  AniList directly. There is no `IAppInfo`/`AppInfo` equivalent and no
  interceptor that emits client identity headers.
- Its only header interceptor is
  `app/src/main/java/com/mxt/anitrend/model/api/interceptor/ClientInterceptor.kt`
  (Accept, Accept-Language, Accept-Encoding, User-Agent, Connection, Host) and
  `AuthInterceptor.kt` (Authorization) for the AniList client.
- Version metadata already exists in BuildConfig via
  `buildSrc/src/main/java/com/mxt/anitrend/buildsrc/components/AndroidComponents.kt`:
  `VERSION_NAME` (from `gradle/version.properties` `version`), `VERSION_CODE`
  (from `code`), and AGP `DEBUG`. There is no `BUILD_TYPE` string field.

Required changes (from scratch, only if/when the app consumes the edge
`/v1/update` or `/v1/config` endpoints):

1. Add a header-provider interceptor (mirroring v2's `AppInterceptor`) to the
   OkHttp client that talks to the edge.
2. Send `x-app-id: ANITREND_APP` (constant).
3. Send `x-app-package: com.mxt.anitrend` (from `context.packageName` or a
   BuildConfig field).
4. Send `x-app-version` and `x-app-code` from the existing
   `BuildConfig.VERSION_NAME` / `BuildConfig.VERSION_CODE`.
5. Add a `BUILD_TYPE` buildConfigField (or use `BuildConfig.DEBUG`) and send
   `x-app-build-type` with `debug`/`release`.
6. Send `x-device-build-id` from `Build.ID`.
7. Send `x-app-source` (installer package via `PackageManager`, fallback value)
   and `x-app-locale` (locale tag).
8. Ensure the interceptor is applied to the edge client, not just the AniList
   client.

## Issue / PR split

File separate issues in each Android repository and implement there. Do not
silently bundle Android changes into `on-the-edge`:

- `AniTrend/anitrend-v2`: add `x-app-id`/`x-app-package`, rename
  `x-app-build` -> `x-device-build-id` (one PR, or two if the rename is large).
- `AniTrend/anitrend-app`: add the canonical client header provider from
  scratch (single PR when the edge endpoints are adopted).

Coordinate the server compatibility window with client rollout: the edge still
accepts a `product` query parameter that must match `x-app-id`, and rejects
invalid header values in production, so clients must land their header changes
before traffic with old (invalid) headers is expected to work.
