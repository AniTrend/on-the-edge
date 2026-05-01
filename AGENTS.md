# Repository Guidelines

## Project Structure & Module Organization
- Source lives in `src/`; entrypoints are `bootstrap.ts` and `src/setup.ts`.
- Domain packages under `src/package/` (e.g., `config`, `news`, `series`, `episodes`).
- Infrastructure modules: `cache/`, `client/`, `common/`, `database/`, `experiment/`, `guard/`, `logger/`, `middleware/`, `secret/`, `service/`, `telemetry/`.
- Each module declares a scoped export via its `src/**/deno.json` (e.g., `@scope/service`). Use scoped imports; do not cross package boundaries with relative imports (enforced by `anitrend/only-scoped-imports`).

## Build, Test, and Development Commands
- `deno task dev` — run the Danet app locally (honors `PORT`). Example: `deno task dev -- --swagger` to emit Swagger.
- `deno task dev:watch` — run with HMR.
- `deno task test` — run tests; writes coverage to `coverage/`. Target a subset: `deno task test -- --filter "series|episodes"`.
- `deno task fmt` / `deno task fmt:check` — format / verify formatting.
- `deno task lint` — lint with custom rules.
- `deno task check` — type-check entrypoint.
- `deno task build` — compile to `build/edge` for container images.

## Coding Style & Naming Conventions
- Formatting via Deno: 2-space indent, 80-char line width, single quotes.
- Prefer module-scoped imports like `import { TheXemService } from '@scope/service/thexem';`.
- File naming patterns: `*.module.ts`, `*.service.ts`, `*.controller.ts`, `*.schema.ts`, `*.types.ts`; tests use `*.test.ts` or `*.spec.ts`.

## Testing Guidelines
- Test files match `**/*.test.ts`, `**/*.spec.ts`, and `**/testing` helpers.
- Keep tests deterministic: use in-memory adapters and mock fetch utilities under `src/**/testing/`.
- Aim for meaningful coverage; CI expects `deno task fmt:check`, `lint`, and `test` to pass.

## Commit & Pull Request Guidelines
- Follow Conventional Commits: `feat(scope): subject`, `fix(experiment): adjust typings`.
- Branch from `dev` using `feature/123-brief-title` or `fix/456-bug-title`; PRs should target `dev` and link issues.
- Include tests, update docs when behavior changes, and ensure `fmt`, `lint`, and targeted tests pass locally.

## Security & Configuration
- Configure via `.env` (copy from `.env.example`); never commit secrets.
- For observability, set OTEL env vars if exporting traces/metrics/logs.
