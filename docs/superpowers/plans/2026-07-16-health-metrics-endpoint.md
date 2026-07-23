# Health Metrics Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dependency-free `GET /v1/health` endpoint that returns `status`, `uptime`, and `timestamp`, register it in the OpenAPI contract, and wire it into Docker Compose health checks.

**Architecture:** Extend the existing `AppController` with a `@Get('health')` method. Capture module-load time with a `START_TIME` constant. Create app-level contract and swagger files (`src/app.contract.ts`, `src/app.swagger.ts`). Register the new schema and operation ID in `src/common/openapi/names.ts`. Update the Dockerfile to install `curl` and add `healthcheck` blocks to both Docker Compose files.

**Tech Stack:** Deno, Danet, Zod, @anatine/zod-openapi, Docker Compose

## Global Constraints

- Import `z` from `@scope/common/openapi` in all contract files.
- Every public contract schema must have an explicit `.openapi({ title: 'PascalCase' })` call.
- Every new schema title must be added to `EXPECTED_SCHEMA_NAMES` in `src/common/openapi/names.ts`.
- Every new operation ID must be added to `EXPECTED_OPERATION_IDS` in the same file.
- Use scoped imports for cross-package references; relative imports are allowed within the same directory/package.
- Follow existing Deno formatting: 2-space indent, 80-char line width, single quotes.
- Follow Conventional Commits: `feat(scope): subject` or `fix(scope): subject`.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app.contract.ts` | Create | OpenAPI contract schema for the health response |
| `src/app.swagger.ts` | Create | Re-exports `HealthSwagger` for the controller decorator |
| `src/app.controller.ts` | Modify | Adds `@Get('health')` method with `@ReturnedSchema` |
| `src/common/openapi/names.ts` | Modify | Registers `'Health'` schema and `'health'` operation ID |
| `Dockerfile` | Modify | Installs `curl` alongside `unzip` in the scaffold stage |
| `docker-compose.dev.yaml` | Modify | Adds `healthcheck` block to the `anitrend-edge` service |
| `docker-compose.prod.yaml` | Modify | Adds `healthcheck` block to the `anitrend-edge` service |
| `src/app.controller.test.ts` | Create | Unit test for the `health()` method |

---

### Task 1: Health endpoint contract, controller, and OpenAPI registry

**Files:**
- Create: `src/app.contract.ts`
- Create: `src/app.swagger.ts`
- Modify: `src/app.controller.ts`
- Modify: `src/common/openapi/names.ts`

**Interfaces:**
- Consumes: `z` from `@scope/common/openapi`, `ReturnedSchema` from `@danet/zod`
- Produces: `HealthContract` (Zod schema), `HealthSwagger` (decorator input), `AppController.health()` method returning `{ status, uptime, timestamp }`

- [ ] **Step 1: Create the OpenAPI contract**

Create `src/app.contract.ts`:

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

- [ ] **Step 2: Create the swagger re-export**

Create `src/app.swagger.ts`:

```ts
import { HealthContract } from './app.contract.ts';

export const HealthSwagger = HealthContract;
```

- [ ] **Step 3: Add the health method to AppController**

Modify `src/app.controller.ts` to import `ReturnedSchema` and `HealthSwagger`, add the `START_TIME` constant, and add the `health()` method:

```ts
import { Context, Controller, type ExecutionContext, Get } from '@danet/core';
import { ReturnedSchema } from '@danet/zod';
import { SecretService } from '@scope/secret';
import { HealthSwagger } from './app.swagger.ts';

const START_TIME = Date.now();

@Controller('/v1')
export class AppController {
  constructor(
    private readonly secret: SecretService,
  ) {}

  @Get()
  index(
    @Context() { req }: ExecutionContext,
  ) {
    const userAgent = req.raw.headers.get('user-agent');
    const host = req.raw.headers.get('host');
    return {
      agent: userAgent,
      host,
      environment: this.secret.environment(),
    };
  }

  @Get('health')
  @ReturnedSchema(HealthSwagger)
  health() {
    return {
      status: 'healthy',
      uptime: Date.now() - START_TIME,
      timestamp: new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 4: Register the schema and operation ID**

Modify `src/common/openapi/names.ts`:

Add `'Health'` to `EXPECTED_SCHEMA_NAMES` (append after the last entry, keeping alphabetical/section grouping if any):

```ts
export const EXPECTED_SCHEMA_NAMES = [
  // ... existing entries ...

  // Health (direct response)
  'Health',
] as const;
```

Add `'health'` to `EXPECTED_OPERATION_IDS` (append after the last entry):

```ts
export const EXPECTED_OPERATION_IDS = [
  // ... existing entries ...
  'sendTestPush',
  'health',
] as const;
```

- [ ] **Step 5: Type-check and lint**

Run:

```bash
deno task check
```

Expected: Clean exit (no type errors).

Run:

```bash
deno task fmt:check
```

Expected: Clean exit (no formatting issues).

Run:

```bash
deno lint
```

Expected: Clean exit (no lint errors).

- [ ] **Step 6: Commit**

```bash
git add src/app.contract.ts src/app.swagger.ts src/app.controller.ts src/common/openapi/names.ts
git commit -m "feat(app): add health metrics endpoint with openapi contract"
```

---

### Task 2: Docker infrastructure

**Files:**
- Modify: `Dockerfile`
- Modify: `docker-compose.dev.yaml`
- Modify: `docker-compose.prod.yaml`

**Interfaces:**
- Consumes: None
- Produces: `curl` available in the final container image; `healthcheck` configured in both compose files

- [ ] **Step 1: Install curl in the Dockerfile**

Modify `Dockerfile`. Change line 8 from:

```dockerfile
RUN apt-get install unzip
```

To:

```dockerfile
RUN apt-get install curl unzip
```

- [ ] **Step 2: Add healthcheck to docker-compose.dev.yaml**

Modify `docker-compose.dev.yaml`. Add a `healthcheck` block inside the `anitrend-edge` service, after the `restart` property:

```yaml
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:${PORT}/v1/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

- [ ] **Step 3: Add healthcheck to docker-compose.prod.yaml**

Modify `docker-compose.prod.yaml`. Add the same `healthcheck` block inside the `anitrend-edge` service, after the `restart` property:

```yaml
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:${PORT}/v1/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile docker-compose.dev.yaml docker-compose.prod.yaml
git commit -m "chore(docker): add curl and compose healthchecks"
```

---

### Task 3: Controller test and contract validation

**Files:**
- Create: `src/app.controller.test.ts`

**Interfaces:**
- Consumes: `AppController` from `./app.controller.ts`, `createMockSecret` from `@scope/common/testing`
- Produces: Passing unit test for `AppController.health()`

- [ ] **Step 1: Write the controller test**

Create `src/app.controller.test.ts`:

```ts
import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertExists } from '@std/assert';
import { AppController } from './app.controller.ts';
import { createMockSecret } from '@scope/common/testing';

describe('AppController', () => {
  it('health returns status, uptime, and timestamp', () => {
    const { service: secret } = createMockSecret();
    const controller = new AppController(secret);

    const result = controller.health();

    assertEquals(result.status, 'healthy');
    assertEquals(typeof result.uptime, 'number');
    assertEquals(result.uptime >= 0, true);
    assertExists(result.timestamp);
  });
});
```

- [ ] **Step 2: Run the targeted test**

```bash
deno test -P src/app.controller.test.ts
```

Expected: Test passes with output showing `ok` for the single test case.

- [ ] **Step 3: Run the full test suite**

```bash
deno task test
```

Expected: All tests pass; coverage report generated in `coverage/`.

- [ ] **Step 4: Generate the swagger spec**

```bash
deno task swagger:generate
```

Expected: `Swagger spec generated at .github/swagger-spec.json` logged to stdout.

- [ ] **Step 5: Validate the OpenAPI contract**

```bash
deno task swagger:validate
```

Expected: `✓ OpenAPI contract validation passed: .github/swagger-spec.json`

- [ ] **Step 6: Commit**

```bash
git add src/app.controller.test.ts
git commit -m "test(app): add health endpoint controller test"
```

---

## Self-Review

**Spec coverage:**
- [x] `GET /v1/health` endpoint returning `status`, `uptime`, `timestamp` — Task 1, Step 3
- [x] OpenAPI contract with `.openapi({ title: 'Health' })` — Task 1, Step 1
- [x] Swagger re-export for `@ReturnedSchema` — Task 1, Step 2
- [x] Schema name `'Health'` in `EXPECTED_SCHEMA_NAMES` — Task 1, Step 4
- [x] Operation ID `'health'` in `EXPECTED_OPERATION_IDS` — Task 1, Step 4
- [x] `curl` installed in Dockerfile — Task 2, Step 1
- [x] `healthcheck` in `docker-compose.dev.yaml` — Task 2, Step 2
- [x] `healthcheck` in `docker-compose.prod.yaml` — Task 2, Step 3
- [x] Controller-level unit test — Task 3, Steps 1-2
- [x] Swagger generation and validation — Task 3, Steps 4-5

**Placeholder scan:** No TBD, TODO, or vague requirements found. All steps include exact file paths, exact code, and exact commands.

**Type consistency:**
- `HealthContract` shape matches `AppController.health()` return shape
- `HealthSwagger` is the same object as `HealthContract`, consumed by `@ReturnedSchema`
- `'Health'` in `EXPECTED_SCHEMA_NAMES` matches `title: 'Health'` in the contract
- `'health'` in `EXPECTED_OPERATION_IDS` matches the method name `health()`
