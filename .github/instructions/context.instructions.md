---
applyTo: '**'
---

This repository ("on-the-edge") is a Deno TypeScript service implementing API routes and application logic for AniTrend. The codebase is organized under `src/` and contains core infrastructure (logging, OTEL), middleware, feature experiments, and domain modules such as `news` and `series` with sources, repositories, services, transformers, and tests.

When creating, editing, or reviewing code, follow these rules strictly:


## 1. Project Overview
This repository, "on-the-edge", is a Deno TypeScript service for AniTrend. It implements API routes, application logic, and domain features in a modular structure, leveraging core infrastructure like logging and distributed tracing.

## 2. Repository Structure
Key files and folders:
- `deno.json`, `deno.lock`
	- Deno configurations and lockfile. Use Deno CLI for execution, tests, and formatting by default.
- `src/server.ts`, `src/routes.ts`
	- Entry points for server bootstrap and route definitions.
- `src/common/`
	- Shared core: environment loading, logging, OTEL tracing, middleware, MongoDB factory.
- `src/config/`
	- Configuration sources, repository, and transformers for environment-based settings.
- `src/news/`, `src/series/`
	- Domain feature modules organized into controller, service, repository, transformer, and local source.

Prompting and code generation conventions
- When the user asks for changes, produce a short checklist of requirements derived from the request and proceed only after creating a todo list entry.
- Make one logical change per patch. If multiple files must be changed, group them into a single pull request with a descriptive title and a short summary.

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

- For any code edits, run quick validation steps: `deno fmt`, `deno lint` and `deno test` (targeted to changed files when possible). Report pass/fail.

## 4. Prompting Conventions
1. Derive a checklist of requirements from user requests; log tasks via todo lists.
2. Apply one logical change per patch; group multi-file updates in a single PR with summary.
3. Validate edits with `deno fmt`, `deno lint`, `deno test --filter` and report outcomes.
4. Include unit tests (happy path + edge case) for new behaviors.


## 5. Quality Gates
- **Build**: run `deno cache` after adding dependencies.
- **Lint/Format**: run `deno fmt` and `deno lint`.
- **Tests**: run `deno test --filter <module>`; ensure coverage for changes.

------------
## 6. Assumptions
- Default to Deno CLI (`deno run --allow-net ...`) if runtime unspecified.
- Assume environment vars are managed externally (Docker, Compose, CI).
- For new config, prefer `src/config` and `deno.json` updates.

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
	4. Run `deno test` for new files.
- **Fix a failing test**:
	1. Run `deno test --filter <name>`.
	2. Apply minimal code change and update tests.
	3. Run `deno fmt` & `deno lint` before commit.

- If adding configuration, prefer adding to `src/config` and `deno.json` rather than top-level changes.

## 10. References
- OTEL & tracing: `src/common/core/otel.ts`.
- Logging: `src/common/core/logger.ts`.
- Domain examples: `src/news`, `src/series`.
- Error Handling: A centralized error middleware in `src/common/middleware/error.ts` handles exceptions.

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
- Add a new domain service:
	1. Create `src/<domain>/service/<name>.service.ts` alongside tests in the same folder.
 2. Wire it into the domain `index.ts` and export from the module.
 3. Add or update any repository/transformer files as needed.
 4. Write tests and run `deno test` for the new files.

- Fix a failing test:
 1. Run `deno test --filter <test-name>` and inspect failure.
 2. Make minimal code change with accompanying unit test update.
 3. Run `deno fmt` and `deno lint` before committing.

Contact and context references
------------------------------
- The codebase uses OTEL and structured logging — consult `src/common/core/otel.ts` and `src/common/core/logger.ts` for tracing and logging patterns.
- Look at existing domain implementations (e.g., `src/news`, `src/series`) as reference for new modules.
