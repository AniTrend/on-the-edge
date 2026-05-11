# Deno Practices Reference

## Runtime & Version

- **Pinned version**: Deno (CI, Dockerfile, recommended locally).
- Verify with `deno --version`.

---

## Task Commands

| Task | Command | Notes |
|------|---------|-------|
| Dev server | `deno task dev` | Honors `PORT`; add `-- --swagger` for Swagger UI |
| Dev with HMR | `deno task dev:watch` | Hot-module reload |
| Run tests | `deno task test` | Writes coverage to `coverage/` |
| Run subset | `deno task test -- --filter "<pattern>"` | e.g., `--filter "series|news"` |
| Format | `deno task fmt` | Applies formatting in-place |
| Format check | `deno task fmt:check` | CI verification (no writes) |
| Lint | `deno task lint` | Includes custom `anitrend/only-scoped-imports` rule |
| Type check | `deno task check` | Type-checks `bootstrap.ts` entrypoint |
| Cache deps | `deno task cache` | Run after adding/updating dependencies |
| Build binary | `deno task build` | Compiles to `./build/edge` |
| Show stable updates | `deno task deps:stable:show` | Non-breaking dependency upgrades |
| Show latest updates | `deno task deps:latest:show` | Potentially breaking upgrades |
| Apply stable updates | `deno task deps:stable:update` | Skips `zod`; update that manually |

---

## Permissions Model

All permissions are declared in `deno.json` under `permissions.default`. The `-P` flag in tasks uses this block. Never request permissions broader than listed:

```jsonc
"permissions": {
  "default": {
    "read":  [".env", "/.dockerenv"],
    "write": [".github/swagger-spec.json"],
    "env":   true,
    "net":   true,
    "sys":   ["osRelease", "uid", "gid", "hostname", "userInfo"],
    "run":   ["/bin/sh"]
  }
}
```

Tests additionally allow `read: [".env"]` and `env: true`. If a test needs `--allow-sys=osRelease`, pass it explicitly (e.g., `deno test -P --allow-sys=osRelease src/...`).

---

## Unstable Flags — Current Status (Deno 2.7.11)

| Flag | Status | Action |
|------|--------|--------|
| `--unstable-temporal` | **STABLE** in 2.7+ | Can be removed from tasks |
| `--unstable-experimentalDecorators` | **STABLE** in 2.7+ | CLI flags can be removed; keep `compilerOptions` |
| `--unstable-emitDecoratorMetadata` | **STABLE** in 2.7+ | CLI flags can be removed; keep `compilerOptions` |
| `--unstable-otel` | Mixed — validate before removing | Test without the flag first |
| `--unstable-cron` | No active use | Safe to remove |

See `/memories/repo/deno-2.7-unstable-features.md` for the full migration plan and known blockers (series repository Temporal tests).

---

## Module System & Import Conventions

### Workspace Layout
Each subdirectory under `src/` is a workspace package with its own `deno.json` that declares `exports`. External packages import via the `@scope/*` alias; internal code uses relative imports.

```
src/
  cache/deno.json      → exports → @scope/cache
  client/deno.json     → exports → @scope/client
  common/deno.json     → exports → @scope/common
  database/deno.json   → exports → @scope/database
  …
```

### Custom Lint Rule: `anitrend/only-scoped-imports`
Cross-module imports **must** use the `@scope/*` alias. Violations are caught by `deno task lint`. Never use deep relative paths across module boundaries.

```ts
// CORRECT
import { LoggerService } from '@scope/logger';
import { Collection } from '@scope/database/collection';

// WRONG — cross-module relative import
import { LoggerService } from '../../logger/logger.service.ts';
```

---

## Formatter Settings

Enforced by `deno task fmt` and checked in CI by `deno task fmt:check`:
- `indentWidth: 2` (spaces)
- `lineWidth: 80`
- `singleQuote: true`
- `useTabs: false`
- `proseWrap: preserve`

Do not configure editors to override these values.

---

## Decorator Usage (Danet Framework)

`experimentalDecorators: true` and `emitDecoratorMetadata: true` are set in `deno.json` `compilerOptions` and `tsconfig.json`. These are required by Danet's DI system.

Common patterns:
```ts
@Controller('items')
@Injectable()
export class ItemController {
  constructor(@Inject(ItemService) private readonly service: ItemService) {}

  @Get()
  async list(@Query() query: ListQueryDto): Promise<ItemDto[]> {
    return this.service.list(query);
  }
}
```

---

## Testing Patterns

```ts
import { assertEquals } from '@std/assert';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';

Deno.test('description', async (t) => {
  await t.step('should do X', async () => {
    mockFetch('https://api.example.com/endpoint', {
      body: JSON.stringify({ data: [] }),
      status: 200,
    });

    // ... test body

    resetFetch();
  });
});
```

- Use `Deno.test` with sub-steps for complex flows.
- Use `@std/testing/mock` for spies and stubs on internal functions.
- In-memory `Collection<T>` adapters live in `src/**/testing/` directories.
- Never make real network calls in tests.

---

## Configuration & Environment

Runtime config flows through `src/secret/secret.service.ts` using `@std/dotenv`. Required env vars are documented in `.env.example`. Do not read `process.env` or `Deno.env` directly in domain code — use the injected secret service.

---

## Temporal API (Date/Time)

Use `Temporal` (globally available in Deno 2.7+) via utilities in `src/common/utils/date.util.ts`:

```ts
import { currentInstant } from '@scope/common/utils/date';

const now = currentInstant(); // Temporal.Instant
const ttlMs = now.until(future).total('milliseconds');
```

Avoid `Date.now()` in business logic; prefer `Temporal.Now.instant()` for testable, precise timestamps.
