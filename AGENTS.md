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

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
