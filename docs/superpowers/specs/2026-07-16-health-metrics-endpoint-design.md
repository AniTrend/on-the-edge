# Health Metrics Endpoint Design

## Context

The edge service currently exposes a root `GET /v1` endpoint (`AppController.index`) that returns basic runtime metadata (`agent`, `host`, `environment`). Neither `docker-compose.dev.yaml` nor `docker-compose.prod.yaml` defines container health checks. This design adds a dedicated `GET /v1/health` endpoint with basic metrics and wires it into Docker Compose health checks.

## Goals

1. Expose a lightweight `GET /v1/health` endpoint returning `status`, `uptime`, and `timestamp`.
2. Keep the endpoint dependency-free (no DB, cache, or external service calls).
3. Follow existing OpenAPI contract rules so the generated `swagger-spec.json` remains valid.
4. Add `healthcheck` blocks to both Docker Compose files.
5. Ensure the final container image has `curl` available for the health check command.

## Non-Goals

- Dependency health probes (MongoDB, Redis, Trakt, TMDB, etc.).
- Deno runtime metrics (memory, CPU, event loop lag).
- Modifying the existing `GET /v1` root response.

## Approach

Extend the existing `AppController` with a new `@Get('health')` method. Create app-level contract and swagger files alongside `app.controller.ts`. Register the new schema and operation ID in the OpenAPI guard. Update the Dockerfile and both Docker Compose files.

### Why not a dedicated package?

A full `src/package/health/` domain package would require a controller, module registration in `PackageModule`, and boilerplate files for a three-field static response. The health endpoint is app-level, and `AppController` already owns the `/v1` route prefix, so extending it is the minimal, correct choice.

## Changes

### 1. `src/app.controller.ts`

Add a module-level `START_TIME` constant and a new `health` method:

```ts
const START_TIME = Date.now();

// inside AppController:
@Get('health')
@ReturnedSchema(HealthSwagger)
health() {
  return {
    status: 'healthy',
    uptime: Date.now() - START_TIME,
    timestamp: new Date().toISOString(),
  };
}
```

Import `ReturnedSchema` from `@danet/zod` and `HealthSwagger` from `./app.swagger.ts`.

### 2. `src/app.contract.ts` (new)

```ts
import { z } from '@scope/common/openapi';

export const HealthContract = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  uptime: z.number().openapi({ description: 'Uptime in milliseconds' }),
  timestamp: z.string().openapi({ description: 'ISO 8601 timestamp' }),
}).openapi({
  title: 'Health',
  description: 'Basic health metrics for the edge service',
});
```

### 3. `src/app.swagger.ts` (new)

```ts
import { HealthContract } from './app.contract.ts';

export const HealthSwagger = HealthContract;
```

### 4. `src/common/openapi/names.ts`

- Append `'Health'` to `EXPECTED_SCHEMA_NAMES`.
- Append `'health'` to `EXPECTED_OPERATION_IDS`.

### 5. `Dockerfile`

In the `scaffold` stage, add `curl` alongside `unzip`:

```dockerfile
RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install curl unzip
```

### 6. `docker-compose.dev.yaml` & `docker-compose.prod.yaml`

Add a `healthcheck` block to the `anitrend-edge` service:

```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:${PORT}/v1/health || exit 1"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 10s
```

## Testing

Add a controller-level test that verifies:

1. `GET /v1/health` returns HTTP 200.
2. The response body contains `status: 'healthy'`.
3. `uptime` is a non-negative number.
4. `timestamp` is a valid ISO 8601 string.

No external dependencies are mocked because the endpoint is completely self-contained.

## OpenAPI Contract Impact

- New component schema: `Health`
- New operation ID: `health`
- The normalizer and guard will validate these additions during `swagger:generate`.

## Rollback

Revert all files listed in the Changes section. Removing `'Health'` from `EXPECTED_SCHEMA_NAMES` and `'health'` from `EXPECTED_OPERATION_IDS` is required to keep the contract check passing.
