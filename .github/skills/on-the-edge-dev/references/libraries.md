# Libraries & Frameworks Reference

All packages resolved via the import map in `deno.json`. Add new dependencies there and run `deno task cache`.

---

## Framework: Danet (DI + HTTP)

| Package | Import | Docs |
|---------|--------|------|
| `@danet/core` | `import { … } from '@danet/core'` | https://jsr.io/@danet/core |
| `@danet/zod` | `import { … } from '@danet/zod'` | https://jsr.io/@danet/zod |
| `@danet/swagger` | `import { … } from '@danet/swagger'` | https://jsr.io/@danet/swagger |

Key Danet decorators: `@Controller`, `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`, `@Injectable`, `@Module`, `@Inject`, `@Body`, `@Param`, `@Query`.

DI wiring lives in `*.module.ts` files. Pass dependencies via constructor injection, never via `AppContext` directly in business logic.

---

## Validation: Zod

| Package | Import | Docs |
|---------|--------|------|
| `zod` | `import { z } from 'zod'` | https://zod.dev |
| `@danet/zod` | `import { ZodValidationPipe } from '@danet/zod'` | https://jsr.io/@danet/zod |
| `@anatine/zod-openapi` | OpenAPI extension | https://github.com/anatine/zod-plugins/tree/main/packages/zod-openapi |

Zod conventions for this project:
- `.nullish()` over `.optional()` — ensures key always present.
- `.transform()` for boundary shape changes.
- `.default()` alongside `.nullish()` when downstream logic needs a fallback.
- Parse at the outermost boundary; keep domain types strict.

---

## HTTP Client

| Package | Import | Docs |
|---------|--------|------|
| `@anitrende/request-client` | `import { … } from '@anitrend/request-client'` | https://jsr.io/@anitrend/request-client |

Centralizes fetch with retry/backoff. Inject via DI — do not call `fetch` directly in business logic.

---

## Testing

| Package | Import | Docs |
|---------|--------|------|
| `@c4spar/mock-fetch` | `import { mockFetch } from '@c4spar/mock-fetch'` | https://jsr.io/@c4spar/mock-fetch |
| `@std/testing` | `import { … } from '@std/testing'` | https://jsr.io/@std/testing |
| `@std/assert` | `import { assertEquals, … } from '@std/assert'` | https://jsr.io/@std/assert |

Always prefer in-memory adapters and mock-fetch over real network calls in tests.

---

## Database

| Package | Import | Docs |
|---------|--------|------|
| `mongodb` | `import { MongoClient } from 'mongodb'` | https://www.mongodb.com/docs/drivers/node/current/ |
| `@db/redis` | `import { connect } from '@db/redis'` | https://jsr.io/@db/redis |

Repositories depend on the `Collection<T>` interface, not the concrete `MongoClient`. Use the in-memory adapter for tests.

---

## Logging

| Package | Import | Docs |
|---------|--------|------|
| `@onjara/optic` | `import { Logger } from '@onjara/optic'` | https://jsr.io/@onjara/optic |
| `@onjara/optic/logger` | `import { … } from '@onjara/optic/logger'` | — |
| `@onjara/optic/formatters` | `import { … } from '@onjara/optic/formatters'` | — |
| `@onjara/optic/consoleStream` | `import { … } from '@onjara/optic/consoleStream'` | — |

Always use `LoggerService` from `src/logger/logger.service.ts`. Never use `console.log` directly. Structured logs only; no PII.

---

## Observability (OTEL)

| Package | Docs |
|---------|------|
| `@opentelemetry/api` | https://opentelemetry.io/docs/languages/js/ |
| `@opentelemetry/sdk-node` | https://opentelemetry.io/docs/languages/js/getting-started/nodejs/ |
| `@opentelemetry/auto-instrumentations-node` | https://opentelemetry.io/docs/zero-code/js/ |
| `@opentelemetry/exporter-trace-otlp-http` | OTLP HTTP trace exporter |
| `@opentelemetry/exporter-metrics-otlp-http` | OTLP HTTP metric exporter |
| `@opentelemetry/exporter-logs-otlp-http` | OTLP HTTP log exporter |
| `@opentelemetry/sdk-logs` | Log SDK |
| `@opentelemetry/sdk-metrics` | Metric SDK |
| `@opentelemetry/resources` | Resource detection |
| `@opentelemetry/semantic-conventions` | Attribute name constants |

See `src/telemetry/telemetry.service.ts` for SDK initialization pattern. Wrap remote calls with OTEL spans; include timing/size stats in debug logs.

---

## Feature Flags

| Package | Import | Docs |
|---------|--------|------|
| `@growthbook/growthbook` | `import { GrowthBook } from '@growthbook/growthbook'` | https://docs.growthbook.io/lib/js |

Feature flags must default **OFF** in tests and local dev. Business logic reads the `Features` interface; inject it, never read GrowthBook globals directly.

---

## Utilities

| Package | Import | Docs |
|---------|--------|------|
| `@std/http` | `import { … } from '@std/http'` | https://jsr.io/@std/http |
| `@std/dotenv` | `import { load } from '@std/dotenv'` | https://jsr.io/@std/dotenv |
| `@std/collections` | `import { … } from '@std/collections'` | https://jsr.io/@std/collections |
| `@std/crypto` | `import { … } from '@std/crypto'` | https://jsr.io/@std/crypto |
| `@std/path` | `import { … } from '@std/path'` | https://jsr.io/@std/path |
| `@libs/xml` | `import { parse } from '@libs/xml'` | https://jsr.io/@libs/xml |
| `@rebeccastevens/deepmerge` | `import { deepmerge } from '@rebeccastevens/deepmerge'` | https://jsr.io/@rebeccastevens/deepmerge |

---

## Documentation Lookup Strategy

1. Check `deno.json` `imports` first to confirm the package alias.
2. For JSR packages (`jsr:@scope/pkg`): go to `https://jsr.io/@scope/pkg` → "Docs" tab.
3. For npm packages (`npm:pkg`): go to the package's npm page or its upstream docs site.
4. Use `mcp_io_github_ups_resolve-library-id` + `mcp_io_github_ups_get-library-docs` tools for Context7 lookups when available.
5. Do not guess API signatures — load the docs page first.

---

## Adding a New Dependency

1. Add to `deno.json` `imports` using the full specifier with pinned version: `"pkg": "jsr:@scope/pkg@^x.y.z"`.
2. Run `deno task cache` to cache and update `deno.lock`.
3. Use the alias in code, never bare specifiers.
4. Document the addition reason in the PR description.
