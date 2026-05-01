---
name: on-the-edge-dev
description: Use when working on the AniTrend edge service, especially for repo research, debugging, feature work, dependency lookups, Deno practices, security or performance checks, CI/CD, or keeping this skill's reference map and evals current.
license: Apache-2.0
compatibility: Requires Deno 2.7+ and the on-the-edge repo layout.
metadata:
  migrated-from: .github/instructions/context.instructions.md
  source-format: instructions
allowed-tools:
  - mcp_context-mode_ctx_search
  - mcp_context-mode_ctx_batch_execute
  - mcp_context-mode_ctx_execute
  - mcp_context-mode_ctx_execute_file
---

# on-the-edge Dev Skill

## Overview

This skill keeps development work on the AniTrend edge service anchored to the repository's
current structure, validation rules, and research workflow. Context-mode is the preferred path
for repo discovery and output processing.

## Priority Order

This skill is context-mode first. Use the context-mode MCP tools before raw file reads, grep,
or web fetches whenever you are exploring, summarizing, or comparing repo state.

1. Check memory first with `mcp_context-mode_ctx_search` using `sort: "timeline"` when you
   need prior session or repo context.
2. Gather repo evidence with `mcp_context-mode_ctx_batch_execute` for multi-file or large-output
   tasks.
3. Follow up with `mcp_context-mode_ctx_search` for focused questions.
4. Process logs, diffs, JSON, coverage, or API output with `mcp_context-mode_ctx_execute` or
   `mcp_context-mode_ctx_execute_file`.
5. Use raw file reads only when you already know the exact file you need to edit.

## When to Use

- Adding or modifying a domain package (`src/package/**`)
- Writing or debugging service clients (`src/service/**`)
- Looking up library/framework documentation
- Checking Deno-specific best practices (permissions, tasks, modules, unstable flags)
- Applying security or performance patterns
- Diagnosing or optimizing CI/CD workflows
- Working with Deno permissions, feature flags, OTEL tracing, MongoDB, or Zod schemas

---

## Core Pattern

1. Start with the context-mode map in [./references/context-mode.md](./references/context-mode.md).
2. Load the smallest matching reference only after the starting point is clear.
3. Use the repo instructions for local policy and module-specific rules.
4. Keep new guidance in references or evals, not as a growing wall of prose in this file.

## Reference Files

Load a reference when the task falls in that domain. Do not load all at once.

| Area                   | File                                                                         | Load When                                                     |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Context-Mode Map       | [./references/context-mode.md](./references/context-mode.md)                 | Any repo research, history lookup, or output processing task  |
| Libraries & Frameworks | [./references/libraries.md](./references/libraries.md)                       | Looking up docs, adding packages, reviewing API usage         |
| Deno Practices         | [./references/deno-practices.md](./references/deno-practices.md)             | Permissions, tasks, imports, unstable flags, module structure |
| Security & Performance | [./references/security-performance.md](./references/security-performance.md) | Code review, new integrations, optimization                   |
| CI/CD                  | [./references/cicd.md](./references/cicd.md)                                 | Workflow failures, adding jobs, dependency updates, releases  |

## Reference Map

The reference map is the source of truth for how to research this repository. Keep it current as
the project evolves and use it before loading any other reference when you are unsure where to
start.

- [./references/context-mode.md](./references/context-mode.md) — tool order, search strategy,
  and repo discovery rules
- [./references/libraries.md](./references/libraries.md) — Deno, Danet, Zod, logging, OTEL,
  database, and test dependencies
- [./references/deno-practices.md](./references/deno-practices.md) — tasks, permissions,
  imports, formatting, and testing conventions
- [./references/security-performance.md](./references/security-performance.md) — secrets,
  validation, logging safety, caching, pagination, and remote-call hygiene
- [./references/cicd.md](./references/cicd.md) — CI, release, and dependency update workflows

---

## Quick Reference

| Need                      | Start Here                             |
| ------------------------- | -------------------------------------- |
| Repo discovery            | `./references/context-mode.md`         |
| Package docs              | `./references/libraries.md`            |
| Deno commands and imports | `./references/deno-practices.md`       |
| Safety and performance    | `./references/security-performance.md` |
| CI or release work        | `./references/cicd.md`                 |

## Common Mistakes

- Starting with raw file scans instead of context-mode search.
- Loading every reference file at once.
- Putting growing policy text directly into this file instead of into references or evals.
- Ignoring the repo instruction files under `.github/instructions/`.

## See Also

- [./references/context-mode.md](./references/context-mode.md)
- [./references/libraries.md](./references/libraries.md)
- [./references/deno-practices.md](./references/deno-practices.md)
- [./references/security-performance.md](./references/security-performance.md)
- [./references/cicd.md](./references/cicd.md)

---

## Procedure — General Development Loop

1. **Understand the change scope** — locate affected module(s) in `src/`; check the matching `.github/instructions/*.instructions.md` for domain-specific rules.
2. **Look up docs if uncertain** — use [./references/libraries.md](./references/libraries.md) before fetching web pages.
3. **Implement** — follow layering: controller → service → repository → transformer. Inject all dependencies; no globals in business logic. Treat persisted documents as an external boundary and re-validate repository outputs against the public Zod schema before they reach controllers.
4. **Write/update tests** — deterministic, offline; in-memory adapters and `@c4spar/mock-fetch` only.
5. **Run local quality gates** (in order):
   ```
   deno task fmt
   deno task lint
   deno task check
   deno task test -- --filter "<module>"
   ```
6. **PR readiness** — conventional commit, link issue, update `README.md` or `docs/` if public behavior changed.

---

## Module Cheat-Sheet

```
src/
  package/<domain>/          Domain feature (controller, service, repository, transformer, spec/)
  service/<provider>/        External API clients (trakt, tmdb, jikan, thexem, …)
  common/                    Shared utilities, env loading, date helpers
  cache/                     Redis-backed caching layer
  client/                    Fetch wrapper & retry logic
  database/                  MongoDB factory and Collection<T> interface
  experiment/                GrowthBook feature flags
  guard/                     Request guards (auth, rate-limit)
  logger/                    Optic-based structured logging + OTEL stream
  middleware/                 HTTP middleware (logging, headers, tracing)
  secret/                    Environment variable sourcing
  telemetry/                 OTEL SDK setup; trace/metric/log exporters
```

## Import Convention Quick Reference

```ts
// Cross-module — use @scope alias defined in the module's deno.json exports
import { something } from "@scope/common/core";

// Within the same module — use relative paths
import { helper } from "./utils.ts";

// Never cross module boundaries with deep relative paths
// BAD: import { x } from '../../other-module/internal/file.ts';
```

## Zod Quick Reference

```ts
// Prefer nullish + default over optional
field: z.string().nullish().default(null),

// Use finite numbers for values that must survive JSON/OpenAPI/GraphQL serialization
publishedOn: z.number().finite(),

// Transform at the boundary
rawField: z.string().transform((v) => v.trim()),

// Compose reusable fragments
const base = z.object({ id: z.string() });
const extended = base.extend({ name: z.string().nullish() });
```
