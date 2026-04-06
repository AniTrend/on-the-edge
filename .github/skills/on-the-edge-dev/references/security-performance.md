# Security & Performance Reference

## Security

### Secrets Management

- **Never** read from `.env` in generated code; use `.env.example` as the template.
- All environment variables are sourced through `src/secret/secret.service.ts`.
- Required variables must be documented in `.env.example` and in `docs/`.
- Do not log secret values at any level; mask or omit them entirely.

```ts
// CORRECT — inject SecretService, read via it
constructor(@Inject(SecretService) private readonly secrets: SecretService) {}

// WRONG — direct Deno.env access inside business logic
const apiKey = Deno.env.get('MY_API_KEY');
```

### Input Validation (OWASP A03 — Injection)

- All inbound data (HTTP body, query params, path params) must be validated with Zod at the controller boundary before it reaches business logic.
- Use `ZodValidationPipe` from `@danet/zod` for automatic DTO validation on controller methods.
- Reject unknown fields with `.strict()` on DTOs that must not accept extra properties.
- Treat external API response payloads as untrusted — validate with Zod in transformer layer before mapping to domain types.

```ts
// Safe: schema-validated body
@Post()
async create(@Body() body: CreateItemDto): Promise<ItemDto> { … }

// CreateItemDto uses ZodValidationPipe with .strict() schema
```

### Authentication & Authorization (OWASP A01, A07)

- Guards in `src/guard/` enforce authentication checks before controllers run.
- Never trust client-supplied identifiers as authorization proof; validate against stored state.
- Follow the instructions in `.github/instructions/guard.instructions.md` when adding guards.

### Sensitive Data Exposure (OWASP A02)

- No PII in logs. Use structured logs with explicit allow-list of fields.
- No PII in OTEL spans — tag spans with non-identifying keys (operation name, status code, timing).
- Secrets must not appear in stack traces, error responses, or log streams.

### Dependency Security (OWASP A06)

- Pin to exact minor versions with `^x.y.z` (semver-compatible) in `deno.json`.
- Run `deno task deps:stable:show` weekly (automated via the `quality.yml` workflow).
- Do not declare `--allow-all` in production tasks; enumerate exact permissions.
- Avoid transitive npm packages with known CVEs — review npm advisory database if adding new npm deps.

### Error Handling (OWASP A05)

- Catch all unhandled errors at the middleware boundary; never let raw errors reach the HTTP response.
- Return standardized error shapes — do not expose internal stack traces to clients.
- Log errors with structured context (operation, correlation ID) but without user data.

---

## Performance

### Remote Calls

- Wrap every external HTTP call with an OTEL span:

```ts
const span = tracer.startSpan('jikan.getAnime');
try {
  const result = await this.client.get('/anime/' + id);
  span.setAttribute('response.size', JSON.stringify(result).length);
  return result;
} finally {
  span.end();
}
```

- Log timing and response size at `debug` level; avoid logging entire payloads.
- Use retry/backoff via `@anitrend/request-client` knobs — do not implement ad-hoc retries.

### Caching

- Cache-aware repositories check TTL before firing remote calls. Pattern from `src/package/news/news.repository.ts`:

```ts
const elapsed = cached.fetchedAt.until(Temporal.Now.instant());
if (elapsed.total('hours') < 12) return cached.data;
```

- Redis cache wraps are configured via `src/cache/`; inject the cache client, do not create instances inline.
- Document cache TTLs in code comments and `docs/` when they affect user-visible freshness.

### Pagination

- All list endpoints must use opaque, cursor-based pagination (not offset/page).
- Cursors encode a filter hash — changing query params invalidates existing cursors by design.
- Enforce a sensible default page size and a hard max to prevent unbounded queries.

### MongoDB Query Efficiency

- Always project only the fields needed: `{ projection: { _id: 1, title: 1 } }`.
- Index fields used in filter queries; document index requirements in `docs/database.md`.
- Avoid `$where` and full-collection scans in production paths.
- Use `Collection<T>` interface — the adapter enforces consistent query patterns.

### Startup and Boot Performance

- Service injection happens at bootstrap via Danet's DI container — keep constructors cheap (no blocking I/O).
- Defer expensive initialization (OTEL SDK, MongoDB connection) to lazy or `onApplicationBootstrap` lifecycle hooks.
- Use `deno task build` output for production containers — AOT compiled binary skips JIT warmup.

---

## OWASP Top 10 Quick Checklist

When reviewing a new module or PR, verify:

| # | Risk | Check |
|---|------|-------|
| A01 | Broken Access Control | Guards applied; no user-controlled authorization bypass |
| A02 | Cryptographic Failures | Secrets not logged; HTTPS enforced for outbound calls |
| A03 | Injection | Zod validates all external input; no string concatenation in queries |
| A04 | Insecure Design | Cursor pagination; no predictable resource IDs exposed externally |
| A05 | Security Misconfiguration | Permissions declared narrowly in `deno.json`; no `--allow-all` |
| A06 | Vulnerable Components | Dependencies reviewed; lock file committed |
| A07 | Auth Failures | Guards consistently applied; tokens never logged |
| A08 | Software Integrity | Lock file (`deno.lock`) committed and validated in CI |
| A09 | Logging Failures | Structured logs; errors logged with context, not user data |
| A10 | SSRF | Outbound URLs validated or allowlisted; no user-controlled fetch targets |
