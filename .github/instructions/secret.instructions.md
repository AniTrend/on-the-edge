---
applyTo: "src/secret/**"
description: "Guidelines for secret sourcing and configuration."
---

- All configuration flows through `secret.service.ts`; never hard-code secrets.
- Provide stub providers for tests; no external reads in unit tests.
- Validate shapes with Zod; prefer `.nullish()` and `.transform()` for normalization/defaulting.
