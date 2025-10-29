---
applyTo: "src/cache/**"
description: "Guidelines for cache modules and utilities."
---

- Encapsulate caching behind interfaces; inject cache service.
- Validate cache keys/payloads with Zod where appropriate; prefer `.nullish()` and schema `.transform()`.
- Tests: deterministic TTLs; avoid time-based flakes by controlling clock or using small windows.
