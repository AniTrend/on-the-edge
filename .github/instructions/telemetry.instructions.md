---
applyTo: "src/telemetry/**"
description: "Guidelines for OTEL and tracing utilities."
---

- Wrap significant remote calls and pipelines with spans; keep sampling reasonable.
- No PII in attributes; include counts, sizes, durations.
- Provide no-op adapters for tests.
