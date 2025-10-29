---
applyTo: "src/middleware/**"
description: "Guidelines for HTTP middleware (logging, headers, growthbook, tracing)."
---

- Keep middleware stateless and composable; no domain logic.
- Ensure logs are PII-free; include request IDs and timing where available.
- Wrap request/response handling in OTEL spans where it adds value.
- Configuration via DI and `secret.service.ts` sources.
- Minimal validation; prefer boundary validation at controllers/services using Zod (prefer `.nullish()` and schema transforms).
