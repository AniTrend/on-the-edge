---
applyTo: "src/experiment/**"
description: "Guidelines for feature flags and experiments."
---

- Default all flags OFF; inject features explicitly.
- Keep experiment evaluation at boundaries; business logic reads a typed `Features` interface.
- Tests must assert both OFF and ON toggles for changed behavior.
