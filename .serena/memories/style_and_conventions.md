# Style & Conventions
- **Formatting**: `deno fmt` defaults (2-space indent, 80-char width, single quotes). Avoid introducing non-ASCII unless required.
- **Imports**: Use `@scope/<module>` aliases across modules, relative paths within a module. Enforced by custom lint rule `anitrend/only-scoped-imports`.
- **TypeScript Practices**: Prefer explicit types, DI constructor injection, pure helpers, small focused modules. Avoid global state.
- **Validation**: Use Zod schemas close to I/O boundaries (`schema.nullish()` preferred). Document default transformations.
- **Testing**: Deterministic, offline. Stub fetch, use in-memory adapters, control time for TTL tests.
- **Logging & Observability**: Structured logs via `LoggerService`; wrap remote calls with OTEL spans; avoid PII in logs.
- **Feature Flags**: Inject `Features` provider; default flags OFF in tests and enable explicitly per scenario.