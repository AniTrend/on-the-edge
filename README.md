# on-the-edge
[![deno-test](https://github.com/AniTrend/on-the-edge/actions/workflows/deno-test.yml/badge.svg)](https://github.com/AniTrend/on-the-edge/actions/workflows/deno-test.yml)

Deno edge functions for anitrend-v2 to offload data aggregation out of the main application.

## Testing utilities

See docs/testing-utilities.md for Deno-native helpers (stubFetch, onGet/onPost, setEnvScoped) to write deterministic, offline tests.

## Series: episodes docs

See docs/series/episodes-pipeline.md for a high-level overview of the episodes endpoint pipeline and modules.

## Observability (OTEL)

OpenTelemetry initialization is now lazy and opt-in to avoid side effects during unit tests.

- Runtime: OTEL is initialized in `createState()` via `init()` from `src/common/core/otel.ts`. This happens when the server boots (see `src/common/core/setup.ts`).
- Tests: Importing modules will not auto-start OTEL; tests run without initializing the SDK. Shutdown remains available via `shutdown()` for runtime signals.
- Configuration: Set the following env variables to enable exporters. If a given endpoint is omitted, that exporter is skipped.
	- `OTEL_DENO_SERVICE_NAME` (service name)
	- `DENO_VERSION` (service version)
	- `DENO_ENV` (deployment environment)
	- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
	- `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`
	- `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`

To disable observability entirely, omit the OTLP endpoint variables.
