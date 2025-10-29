---
applyTo: "src/logger/**"
description: "Guidelines for logging modules and stream handlers."
---

- Use structured logs; no PII.
- Provide logger via DI; do not create ad-hoc loggers in leaf modules.
- Include OTEL context where relevant; avoid coupling to request objects in deep layers.
