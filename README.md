# on-the-edge
[![Deploy](https://github.com/AniTrend/on-the-edge/actions/workflows/deploy.yml/badge.svg)](https://github.com/AniTrend/on-the-edge/actions/workflows/deploy.yml) [![CI](https://github.com/AniTrend/on-the-edge/actions/workflows/ci.yml/badge.svg)](https://github.com/AniTrend/on-the-edge/actions/workflows/ci.yml)

> AniTrend’s Danet-based edge service for aggregating anime metadata, normalising provider payloads, and exposing a typed API surface at the edge.

## What changed with the Danet migration?

- **Framework**: We replaced Oak with [Danet](https://danet.land) to gain decorator-based dependency injection, module scoping, and easier composition for edge deployments.
- **Modules-first architecture**: `AppModule` wires together cache, database, experiment, logger, secret, telemetry, and domain packages. Each module exports a focused public surface via `@scope/*` aliases.
- **HTTP client + services**: Remote integrations (TMDB, Trakt, TheXem, etc.) now use a shared request client with interceptors, Zod parsing, and OTEL instrumentation.
- **Persistence abstraction**: MongoDB access flows through a `Collection<T>` interface with Mongo and in-memory adapters, making tests deterministic.
- **Edge bootstrap**: `bootstrap.ts` hosts the server, handles graceful shutdown, and optionally emits Swagger specs via `--swagger`.

## Getting started

1. **Install prerequisites**
	 - [Deno **2.7.10**](https://deno.land/) or newer (matches CI `denoland/setup-deno@v2` pin).
	 - Optional: Docker for local MongoDB if you want realistic persistence.
2. **Clone & configure**
	 ```bash
	 git clone https://github.com/AniTrend/on-the-edge.git
	 cd on-the-edge
	 cp .env.example .env
	 ```
	 Fill in provider URLs/keys (`TMDB`, `TRAKT`, GrowthBook, Mongo creds, etc.). Keep secrets out of source control.
3. **Install dependencies** (cached by Deno on demand)
	 ```bash
	 deno task cache
	 ```

## Running the service locally

- Launch the Danet application (listens on `PORT`, default `9800`):
	```bash
	deno task dev
	```
- Generate and host Swagger docs while running:
	```bash
	deno task dev -- --swagger
	```
- Hot reload during development:
	```bash
	deno task dev:watch
	```

`bootstrap.ts` ensures graceful shutdown on `SIGINT`/`SIGTERM` and will clean up active timers before exit.

## Deno 2.7 stabilization notes

- Removed deprecated unstable flags for stabilized features:
	- `--unstable-temporal`
	- `--unstable-experimentalDecorators`
	- `--unstable-emitDecoratorMetadata`
- Removed `--unstable-otel` and `--unstable-cron` after Phase 2 validation:
	- `deno compile` works without both flags
	- app startup and OpenTelemetry bootstrap succeed without both flags

## Quality gates

| Purpose       | Command                              |
|---------------|---------------------------------------|
| Format        | `deno task fmt` / `deno task fmt:check` |
| Lint          | `deno task lint`                      |
| Type check    | `deno task check`                     |
| Tests         | `deno task test`                      |
| Targeted test | `deno task test --filter <pattern>`   |

Tests are fully offline: use `@c4spar/mock-fetch`, in-memory cache/database adapters, and `FakeTime` for TTL-sensitive flows.

## Project layout

```
src/
	app.module.ts        # Danet root module wiring all infrastructure
	setup.ts             # Application bootstrap + middleware + swagger
	cache/               # In-memory cache service (Redis planned post-migration)
	client/              # Shared HTTP client, interceptors, and tests
	common/              # Core utilities, DI helpers, logging & OTEL support
	database/            # Mongo adapters + in-memory collections for tests
	experiment/          # GrowthBook feature flag provider
	guard/               # Global header guard for API requests
	logger/              # LoggerService + stream wiring
	middleware/          # Logger, tracing, header, and GrowthBook middleware
	package/             # Domain packages (config, news, series, episodes)
	secret/              # Environment-backed secret service
	service/             # External service clients (Trakt, TMDB, TheXem, etc.)
	telemetry/           # OTEL SDK bootstrap and exporters
```

Each folder exposes its public surface via `deno.json`/`index.ts`, enabling imports like `import { TheXemService } from '@scope/service/thexem';`.

## Caching strategy

- `CacheService` currently ships as an in-memory map suitable for local dev and tests. It enforces TTL on read but has **no** persistence or eviction policy.
- Production deployments should wire a Redis-backed client (planned once the Danet migration stabilises). Until then, cache misses should be expected on restarts.

## Observability

- `TelemetryModule` bootstraps OTEL tracing, metrics, and logs. Enable exporters by providing:
	- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
	- `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`
	- `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`
	- `OTEL_DENO_SERVICE_NAME`
- Global middleware wraps requests with structured logging and trace context; remote service clients instrument outbound calls with span metadata.

## Testing utilities

- Review `docs/testing-utilities.md` for helper APIs (mock fetch, environment scoping, dependency spies).
- Centralized test helpers (mocks, stubs, spies) live in `src/common/testing/` and are exported via `@scope/common/testing`.
- Domain-specific helpers (e.g., in-memory database collections) may live under `src/**/testing/` as needed.

## Contributing checklist

- Follow the [CONTRIBUTING.md](CONTRIBUTING.md) guidelines.
- Keep pull requests focused; update docs when behavior changes.
- Run `deno fmt`, `deno lint`, and targeted `deno task test` before pushing.
- Document new secrets/flags in `.env.example` or `docs/` as appropriate.

For deeper architecture notes, see the documents under `docs/` (service audit, series pipeline, test infrastructure phases).
