---
applyTo: '**'
description: "Guidelines for AI code generation, editing, and review in the 'on-the-edge' Deno TypeScript service repository. Includes project overview, repository structure, coding standards, prompting conventions, quality gates, security practices, and example workflows."
---

This repository ("on-the-edge") is a Deno TypeScript service implementing API routes and application logic for AniTrend. The codebase is organized under `src/` and contains core infrastructure (logging, OTEL), middleware, feature experiments, and domain modules such as `news` and `series` with sources, repositories, services, transformers, and tests.

When creating, editing, or reviewing code, follow these rules strictly:


Contributing quick-start (checklist)
- Create or update code with small, focused changes; keep one logical change per PR.
- Write or update deterministic tests alongside code (use fetch stubs and in-memory adapters).
- Run local gates: `deno fmt`, `deno lint`, and `deno task test` (targeted where possible).
- Document behavior changes in README or `docs/` and note any feature flags/config.
- Prefer DI: inject collections/clients/features; avoid global state in business logic.


## 1. Project Overview
This repository, "on-the-edge", is a Deno TypeScript service for AniTrend. It implements API routes, application logic, and domain features in a modular structure, leveraging core infrastructure like logging and distributed tracing.

## 2. Repository Structure
Key files and folders:
- `deno.json`, `deno.lock`
	- Deno configurations and lockfile. Use Deno CLI for execution, tests, and formatting by default.
- `src/mod.ts`, `src/routes.ts`
	- Entry points for server bootstrap and route definitions.
- `src/common/`
	- Shared core: environment loading, logging, OTEL tracing, middleware, MongoDB factory.
- `src/config/`
	- Configuration sources, repository, and transformers for environment-based settings.
- `src/news/`, `src/series/`
	- Domain feature modules organized into controller, service, repository, transformer, and local source.

Architecture and patterns (decisions)
- Layering: Controllers → Services → Repositories → Transformers/Clients. Keep controllers thin; push logic down into services/repositories; isolate remote shape mapping in transformers.
- Dependency Injection (DI): Inject dependencies (e.g., collections, clients, feature flags) via constructors/params. Avoid reading globals or AppContext directly in business logic; wire in the controller.
- Persistence: Prefer a small `Collection` interface + adapter pattern (e.g., Mongo adapter and in-memory test adapter). Repositories depend on interfaces, not concrete drivers.
- External services: Wrap remote providers behind service clients with explicit input/output types and dedicated transformers. Avoid direct fetch calls sprinkled through business logic.
- Experiments/feature flags: Gate optional or risky integrations behind a `Features` interface. Default flags OFF. Tests explicitly inject features; production uses the experiment provider.
- Pagination: Prefer opaque, cursor-based pagination. Cursors are stable and include a filter hash so changing filters invalidates old cursors by design.
- Testing determinism: Tests are offline. Stub network using small helpers; use in-memory adapters; don’t rely on wall-clock randomness.
- Observability: Use structured logs and OTEL spans around remote calls and significant pipeline steps; keep logs PII-free.

Prompting and code generation conventions
- When the user asks for changes, produce a short checklist of requirements derived from the request and proceed only after creating a todo list entry.
- Make one logical change per patch. If multiple files must be changed, group them into a single pull request with a descriptive title and a short summary.
 - Do not ask the user for feedback or confirmation before proceeding. Execute changes end-to-end until all stated requirements are satisfied. Only ask a clarifying question if you are genuinely blocked by missing critical information.
 - Do not add inline imports unless explicitly requested, or in tests when the need is justified.

## 3. AI Coding Guidelines
When creating, editing, or reviewing code, follow these rules strictly:
1. Use Deno and TypeScript best practices:
	 - `async/await`, explicit public API types, single-purpose functions.
2. Maintain project structure and naming:
	 - Follow existing patterns (`*.service.ts`, `*.repository.ts`, etc.).
3. Keep patches minimal:
	 - Focus on requested changes; avoid unrelated refactors.
4. Add dependencies sparingly:
	 - Use URL-based imports, document additions in `deno.json`.
5. Write tests alongside logic:
	 - Deno test utilities; small, fast, deterministic.
6. Follow error-handling and logging patterns:
	 - Use `error.ts` middleware, structured logs via `logger.ts`.
7. Handle configuration securely:
	 - Load via `env.ts`, use factories, never hard-code secrets.

Implementation preferences (to reduce ambiguity)
- Prefer dependency injection over module-level state or service locators. Functions/classes should accept dependencies explicitly.
- Prefer pure helpers and small modules over large god-objects. If a file grows, extract focused helpers with unit tests.
- Prefer in-memory adapters in tests (e.g., in-memory collections, fake clients) and keep tests fully offline.
- Prefer feature flags for new integrations. Default new flags OFF; write tests for both OFF and ON when behavior changes.
- Prefer defensive input validation at module boundaries; never throw raw errors to the network surface—use centralized error middleware.
- Prefer explicit domain types over `any`; surface narrow interfaces to improve refactor safety.
- Use variable and function names that clearly convey intent and domain meaning. Avoid generic names like `data`, `info`, or `handle`, or short abbreviations that obscure purpose.

Import conventions and module boundaries
- Use `@scope/*` imports for external module dependencies (cross-module imports). Example: `import { logger } from '@scope/common/core';` when importing common utilities from outside the common module.
- Use relative imports for files within the same module. Example: `import { helper } from './utils.ts';` for files in the same directory or module.
- Each module should have a `deno.json` with an `exports` field defining its public API surface. This determines what external modules can import via `@scope/*` patterns.
- Pattern: External imports use `@scope/<module>/<subpath>` based on the target module's exports configuration. Internal imports use relative paths (`./`, `../`).
- Avoid deep relative imports across module boundaries (e.g., `../../other-module/internal/file.ts`). Use `@scope/*` imports that respect the target module's exports instead.

- Autonomy & feedback policy
	- Proceed without asking for interim feedback; complete the full task per the checklist/todos. Provide compact progress updates after meaningful batches of actions (3–5 tool calls or >3 files changed). Ask the user only when an essential detail is missing and assumptions would be risky.

- For any code edits, run quick validation steps: `deno fmt`, `deno lint` and `deno task test` (targeted to changed files when possible). Report pass/fail.

## 4. Prompting Conventions
1. Derive a checklist of requirements from user requests; log tasks via todo lists.
2. Apply one logical change per patch; group multi-file updates in a single PR with summary.
3. Validate edits with `deno fmt`, `deno lint`, `deno task test --filter` and report outcomes.
4. Include unit tests (happy path + edge case) for new behaviors.


## 5. Quality Gates
- **Build**: run `deno cache` after adding dependencies.
- **Lint/Format**: run `deno fmt` and `deno lint`.
- **Tests**: run `deno task test --filter <module>`; ensure coverage for changes.

------------
## 6. Assumptions
- Default to Deno CLI (`deno task start`) if runtime unspecified.
- Assume environment vars are managed externally (Docker, Compose, CI).
- For new config, prefer `deno.json` updates.

- Lint/Format: run `deno fmt` and `deno lint`.

## 7. Security & Safety
- Never read or write into `env` instead use `.env.defaults`
- Do not commit secrets; use `env.ts` and document required variables.
- Avoid outbound network calls in tests; use fakes or injected clients.


## 8. Developer Communication
- Update `README.md` or add docs for public API changes.
- For refactors, open a draft PR with motivation and risk analysis.

------------------------------------------------
## 9. Example Workflows
- **Add a new domain service**:
	1. Create `src/<domain>/service/<name>.service.ts` and test file.
	2. Export in module `index.ts` and update mappings.
	3. Implement repository/transformer as needed.
	4. Run `deno task test` for new files.
- **Fix a failing test**:
	1. Run `deno task test --filter <name>`.
	2. Apply minimal code change and update tests.
	3. Run `deno fmt` & `deno lint` before commit.

- If adding configuration, prefer adding to `src/config` and `deno.json` rather than top-level changes.

## 10. References
- OTEL & tracing: `src/common/core/otel.ts`.
- Logging: `src/common/core/logger.ts`.
- Domain examples: `src/news`, `src/series`.
- Error Handling: A centralized error middleware in `src/common/middleware/error.ts` handles exceptions.
- Testing utilities: `docs/testing-utilities.md` (stubbing fetch, env scoping, helpers)
- Episodes pipeline overview: `docs/series/episodes-pipeline.md`

Security and safety
-------------------
- Do not include secrets or credentials in repo changes. Use `env.ts` and document required env variables.
- Avoid outbound network calls in unit tests. Use small, deterministic fakes or inject remote clients.

Developer communication
-----------------------
- When changes touch behavior or public APIs, update `README.md` or add a short `docs/` note explaining the change and how to test locally.
- For larger refactors, create a draft PR with a clear summary, motivation, and risk assessment.

Example workflows for common tasks
---------------------------------
- **Add a new domain service**:
	1. Create `src/<domain>/service/<name>.service.ts` alongside tests in the same folder.
 2. Wire it into the domain `index.ts` and export from the module.
 3. Add or update any repository/transformer files as needed.
 4. Write tests and run `deno task test` for the new files.
 5. Update the module's `deno.json` exports field to expose the new service's public API.
 6. Use `@scope/<domain>/<export-path>` for external imports and relative paths for internal module imports.

- Fix a failing test:
 1. Run `deno task test --filter <test-name>` and inspect failure.
 2. Make minimal code change with accompanying unit test update.
 3. Run `deno fmt` and `deno lint` before committing.

Contact and context references
------------------------------
- The codebase uses OTEL and structured logging — consult `src/common/core/otel.ts` and `src/common/core/logger.ts` for tracing and logging patterns.
- Look at existing domain implementations (e.g., `src/news`, `src/series`) as reference for new modules.

Additional guidance (contracts, testing, experiments, ways of working)
---------------------------------------------------------------------
API & pagination contracts
- Use cursor-based pagination for list endpoints. Cursors are opaque (base64 JSON or equivalent). They include a stable filter hash so that changing filters invalidates old cursors. Support `after` for forward and `before` for backward windows. Enforce a sensible default and a hard max page size.

Testing practices
- Keep tests deterministic and offline. Use small fetch stubs with path-parameter helpers (e.g., onGet/onPost) and `setEnvScoped` for env overrides. Prefer in-memory adapters for persistence.
- Co-locate unit tests with code or in a nearby tests folder. Cover happy path and 1–2 edge cases. Avoid network calls and sleeps.

Experiments & feature flags
- Represent features via a `Features` interface (GrowthBook-style). Inject it into modules that need gated behavior. Default OFF in tests and local dev; explicitly enable within tests to validate toggled behavior. Never gate behavior directly on raw environment variables inside business logic—use configuration sources and the features provider.

Dependency injection & persistence
- Constructors/functions accept explicit dependencies (collections, clients, feature flags). Repositories depend on `Collection` or `Client` interfaces, enabling easy swapping (e.g., Mongo adapter vs in-memory).

Observability
- Wrap remote calls with OTEL spans and include timing/size information in structured logs at debug level. Ensure no PII is logged. Emit small merge/processing stats when relevant.

Ways of working (contributor checklist)
- Keep PRs small and focused on one logical change. Include tests and a brief doc update if public behavior changes.
- Run `deno fmt`, `deno lint`, and relevant `deno task test` locally before pushing.
- Prefer extracting helpers and writing characterization tests before refactors. Default to interfaces + adapters for external systems.
- Document new flags and configuration under `docs/` (e.g., domain-specific README) and update references.
