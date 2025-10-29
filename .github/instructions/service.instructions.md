---
applyTo: "src/service/**"
description: "Guidelines specific to external service clients and integrations (trakt, tmdb, jikan, etc.)."
---

- Keep controllers thin; put remote-call orchestration inside service clients and repositories.
- Wrap remote providers behind client modules; no ad-hoc fetch in business logic.
- Zod schema practices:
  - Prefer `.nullish()` over `.optional()` and use schema `.transform()` for simple conversions.
  - Parse and validate at the boundary before mapping to domain DTOs.
- Add transformers to isolate remote shape from domain models; tests use mock-fetch and canned payloads.
- Instrument remote calls with OTEL spans and structured logs (sizes, timings) without PII.
- Feature flags gate optional integrations; default OFF in tests and local dev.
- Write offline tests: stub network via `@c4spar/mock-fetch` and in-memory adapters.
