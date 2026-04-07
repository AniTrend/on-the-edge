---
applyTo: "src/package/**"
description: "Guidelines for domain packages (config, episodes, news, series)."
---

- Structure: controller → service → repository → transformer → local source.
- Dependency injection: pass collections/clients/features via constructors; avoid globals.
- Persistence: depend on `Collection<T>` interface; use Mongo/in-memory adapters.
- Persisted records are an external boundary too: validate documents against the exported response schema before returning them so legacy Mongo data cannot drift from the OpenAPI contract.
- Zod schema practices:
  - Prefer `.nullish()` over `.optional()`; use `.transform()` for simple conversions.
  - Mark numeric API fields that must serialize cleanly with `.finite()` when `NaN` would violate downstream GraphQL/OpenAPI consumers.
  - Validate inbound DTOs at boundaries; keep domain models strict.
- Pagination: use opaque cursor-based pagination with filter hash.
- Tests: deterministic, offline; in-memory adapters and mock-fetch only.
- Exports: maintain `deno.json` exports per module; use `@scope/<module>/<subpath>` for cross-module imports.
