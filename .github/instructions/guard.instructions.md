---
applyTo: "src/guard/**"
description: "Guidelines for request guards."
---

- Encapsulate auth/permission checks; no business logic.
- Validate headers/tokens with Zod where applicable; prefer `.nullish()` and schema `.transform()` for normalization.
- Emit clear, centralized errors; avoid leaking raw errors to network surfaces.
