---
applyTo: "src/common/**"
description: "Guidelines for common utilities, core, and shared helpers."
---

- Keep utilities pure and side-effect free; no module-level singletons except well-documented factories.
- Prefer small helpers with explicit types; avoid `any`.
- If runtime validation is needed, use Zod; prefer `.nullish()` and schema `.transform()`.
- Maintain exports in `src/common/deno.json`; external consumers import via `@scope/common/...`.
