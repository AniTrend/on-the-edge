# Service Layer Refactor Contract

## Intent
This document defines the expectations for refactoring the legacy service providers that were migrated into `src/service/**` (excluding the already-completed `arm` module). The goal is to align every service with the Danet DI conventions, our shared HTTP client, and the validation/test tooling now standardized across the project.

## Scope
- **In-scope**: `src/service/{jikan,news,notify,skyhook,theme,thexem,tmdb,trakt}/**`. Each module should expose a single `*.service.ts`, a matching module definition, and any required schema or transformer helpers that remain relevant.
- **Out-of-scope**: `src/service/arm/**` (serves as the canonical reference implementation), unrelated feature packages, and database or bootstrap changes unless a service needs new providers registered.
- **Dependencies**: `src/service/service.module.ts` must aggregate all updated modules so they are available to upstream consumers via `ServiceModule` and `src/service/index.ts`.

## Objectives
- Consolidate outbound HTTP logic on `RequestClient` from `@scope/client` to guarantee consistent telemetry, retry, and timeout defaults.
- Register every service with Danet IoC (`@Injectable`, `@Module`, and associated provider arrays) so they can be composed through dependency injection instead of static helpers.
- Replace direct usage of remote DTOs with `zod` schemas (see `src/service/arm/arm.schema.ts`) and ensure parsed data flows through typed transformer utilities before reaching consumers.
- Flatten any `remote/` subpackages by inlining request orchestration into the service class, keeping only schema/transformer helpers when beneficial.
- Provide resilient tests for each service that performs HTTP calls, using `@c4spar/mock-fetch` helpers and proper teardown to avoid cross-test pollution.
- Catalogue and resolve (or intentionally defer) missing imports that pointed at `@scope/common/{core,helpers,types}` in the originating repository. Only re-create utilities that are required for the refactored service to compile and behave correctly.

## Technical Requirements
### HTTP integration
- Instantiate `RequestClient` in each service constructor, wiring configuration (base URL, headers, retry/timeout) through `SecretService` or module-specific config providers.
- Prefer the composable request builder (`client.request().query().header().send()`) instead of ad-hoc `fetch` wrappers.
- Adopt shared headers via `DEFAULT_HEADERS` where appropriate so observability metadata stays consistent.

### IoC & Module wiring
- Annotate service classes with `@Injectable()` and export them through a module named `<Feature>Module` defined with `@Module({ injectables: [...] })`.
- Update `src/service/service.module.ts` to import and re-export all feature modules so `ServiceModule` remains the single entry point.
- Ensure module providers inject at the bare minimum `LoggerService`, `SecretService`, or other scoped dependencies instead of relying on global singletons.

### Schema & transformation layer
- Define remote payload schemas with `zod` (mirroring `ArmObjectSchema` / `ArmArraySchema`) and use them to validate responses before transformation.
- Port or author transformers that convert parsed remote types into domain types; keep them colocated with the service if they are simple, or in `transformer/*.ts` when they merit isolation.

### File layout
- Collapse `remote/*.ts` request shims into the root `*.service.ts`. Retain supporting `schema`, `transformer`, or `types` folders when they encapsulate reusable logic.
- Remove unused exports from `index.ts` files as the module surface simplifies.

### Dependency reconciliation
- Track every missing import from `@scope/common/{core,helpers,types}` and determine whether an equivalent already exists in this workspace (e.g., `@scope/logger`, `@scope/secret`, `@scope/time`).
- When no replacement exists and the utility is critical, recreate a minimal version under an appropriate shared package (`src/common/` or `src/lib/`) and document the decision.
- If the dependency was optional in the legacy implementation, note the gap and defer with a TODO and issue link so the missing piece is visible.

## Testing Expectations
- Create or update specs under the module in question `<feature>.test.ts` that covers happy paths, error handling, and retry/timeout behavior.
- Use `@c4spar/mock-fetch` utilities (`mockFetch`, `resetFetch`, etc.) to mock HTTP interactions; invoke `resetFetch()` in `beforeEach`/`afterEach` blocks to guarantee isolation.
- Where services rely on configuration, stub `SecretService` via Danet testing utilities or manual provider overrides.
- Ensure tests assert on transformed outputs rather than raw network payloads to validate schema usage.
- Run `deno task test --filter service` (or equivalent targeted command) locally during the refactor and include evidence in PR descriptions.

## Validation Checklist
- `deno fmt` and `deno lint` pass without regressions.
- `deno task test` succeeds, including the newly added service specs.
- All IoC registrations resolve successfully during application bootstrap (verify via `deno task dev` smoke test when feasible).
- `src/service/index.ts` continues to expose the aggregate `ServiceModule` and any intentionally public service classes.

## Risks & Mitigations
- **Missing utilities**: If `@scope/common/*` dependencies are unavailable, unblock progress by stubbing focused replacements and document follow-up work in issues or TODOs referencing this contract.
- **Over-tight coupling**: Keep service constructors lean; prefer injecting collaborators instead of instantiating them manually to maintain testability.
- **Telemetry gaps**: When migrating from custom fetch wrappers, double-check that headers and tracing context align with the `RequestClient` defaults to avoid silent observability regressions.

## Deliverables
- Refactored service modules matching the patterns outlined here.
- Updated `ServiceModule` wiring and any new shared utilities required to satisfy missing dependencies.
- Comprehensive service-level tests aligned with the `@c4spar/mock-fetch` pattern.
- PR documentation referencing this contract alongside evidence of lint/test runs.
