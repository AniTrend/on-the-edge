---
applyTo: "src/client/**"
description: "Guidelines for HTTP client utilities and request wrappers."
---

- Centralize fetch wrappers; prohibit direct fetch in business logic.
- Provide retry/backoff knobs via DI; default conservative.
- Use Zod to validate/parsing of client configuration inputs; prefer `.nullish()` and `.transform()`.
- Tests stub fetch with `@c4spar/mock-fetch`; ensure deterministic behavior.
