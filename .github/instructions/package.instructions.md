---
applyTo: "src/package/**"
description: "Guidelines for domain packages (config, episodes, news, series)."
---

- Structure: controller → service → repository → transformer → local source.
- Dependency injection: pass collections/clients/features via constructors; avoid globals.
- Persistence: depend on `Collection<T>` interface; use Mongo/in-memory adapters.
- Zod schema practices:
  - Prefer `.nullish()` over `.optional()`; use `.transform()` for simple conversions.
  - Validate inbound DTOs at boundaries; keep domain models strict.
- Pagination: use opaque cursor-based pagination with filter hash.
- Tests: deterministic, offline; in-memory adapters and mock-fetch only.
- Exports: maintain `deno.json` exports per module; use `@scope/<module>/<subpath>` for cross-module imports.
