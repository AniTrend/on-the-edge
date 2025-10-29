# Project Overview
- **Purpose**: Deno edge service for AniTrend that offloads data aggregation and API surface, now migrating to the Danet framework.
- **Runtime & Framework**: Runs on Deno with Danet (Nest-like decorators), exposes bootstrap entry at `bootstrap.ts`.
- **Architecture**: Modular `src/` layout (cache, client, common, database, experiment, guard, logger, middleware, package, secret, service, telemetry). Follows controller → service → repository → transformer layering with dependency injection and feature flags.
- **Key Integrations**: MongoDB for persistence, external service clients (TheXem, TMDB, etc.), GrowthBook experiments, OpenTelemetry logging/tracing.
- **Testing Philosophy**: Deterministic offline tests using in-memory adapters and `@c4spar/mock-fetch` utilities.
- **Migration Note**: Current branch focuses on Danet adoption; Redis-based cache planned post-migration.