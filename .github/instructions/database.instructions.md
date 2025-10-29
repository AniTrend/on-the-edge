---
applyTo: "src/database/**"
description: "Guidelines for database adapters, interfaces, and utilities."
---

- Expose a narrow `Collection<T>` interface; repositories depend on interfaces not concrete drivers.
- Provide Mongo and in-memory adapters with identical behavior for tests.
- No business logic in adapters; keep them mechanical.
- Apply small Zod schemas where DB documents need runtime checks (migrations/edge cases). Prefer `.nullish()`; schema `.transform()` for safe coercions.
- Connection and config via `secret.service.ts`; never hard-code secrets.
- Tests: characterization tests for adapters; no live DB in unit tests.
