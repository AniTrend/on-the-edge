---
name: on-the-edge-dev
description: "Development guidance for the on-the-edge Deno TypeScript service (AniTrend). Use when: adding modules/features, debugging, fixing tests, reviewing code, managing dependencies, looking up library docs, optimizing CI/CD, applying security or performance practices, working with Deno permissions, feature flags, OTEL tracing, MongoDB, or Zod schemas."
argument-hint: "Topic or task, e.g. 'add a new domain package', 'look up Danet docs', 'debug CI failure', 'improve test coverage'"
---

# on-the-edge Dev Skill

This skill bundles the authoritative quick-references for developing against the AniTrend edge service. Load the relevant reference file(s) below as the task demands.

## When to Use

- Adding or modifying a domain package (`src/package/**`)
- Writing or debugging service clients (`src/service/**`)
- Looking up library/framework documentation
- Checking Deno-specific best practices (permissions, tasks, modules, unstable flags)
- Applying security or performance patterns
- Diagnosing or optimizing CI/CD workflows

---

## Reference Files

Load a reference when the task falls in that domain — do **not** load all at once.

| Area                   | File                                                                         | Load When                                                     |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Libraries & Frameworks | [./references/libraries.md](./references/libraries.md)                       | Looking up docs, adding packages, reviewing API usage         |
| Deno Practices         | [./references/deno-practices.md](./references/deno-practices.md)             | Permissions, tasks, imports, unstable flags, module structure |
| Security & Performance | [./references/security-performance.md](./references/security-performance.md) | Code review, new integrations, optimization                   |
| CI/CD                  | [./references/cicd.md](./references/cicd.md)                                 | Workflow failures, adding jobs, dependency updates, releases  |

---

## Procedure — General Development Loop

1. **Understand the change scope** — locate affected module(s) in `src/`; check the matching `.github/instructions/*.instructions.md` for domain-specific rules.
2. **Look up docs if uncertain** — use [./references/libraries.md](./references/libraries.md) before fetching web pages.
3. **Implement** — follow layering: controller → service → repository → transformer. Inject all dependencies; no globals in business logic.
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

// Transform at the boundary
rawField: z.string().transform((v) => v.trim()),

// Compose reusable fragments
const base = z.object({ id: z.string() });
const extended = base.extend({ name: z.string().nullish() });
```
