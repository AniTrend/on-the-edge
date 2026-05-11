# CI/CD Reference

## Workflows Overview

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI | `ci.yml` | push/PR to `dev` | Lint, format, type-check, unit tests, multi-OS build |
| Quality | `quality.yml` | Scheduled (Fri 02:00) + manual | Dependency update PR |
| Deploy | `deploy.yml` | Manual / release | Container build & push |
| Publish Snapshot | `publish-snapshot.yml` | On tag push | Snapshot release |
| Swagger Release | `swagger-release.yml` | Release | Publish updated Swagger spec |
| Release Drafter | `release-drafter.yml` | PR merged to `dev` | Auto-draft changelog |
| Auto-Approve | `auto-approve.yml` | PR opened | Auto-approves bot dependency PRs |
| Greeting | `greeting.yml` | First issue/PR | Welcome message |

---

## CI Pipeline (`ci.yml`)

**Deno version**: `2.7.11` (pinned via `denoland/setup-deno@v2` with `cache: true`).

### Job Graph

```
lint-check ─┐
format-check─┼──► unit-test ──► build-matrix
type-check ─┘
```

- `lint-check`, `format-check`, and `type-check` run in parallel.
- `unit-test` awaits all three (`needs: [lint-check, format-check, type-check]`).
- `build-matrix` tests compilation on multiple OS targets.

### Environment Setup

All jobs run `.github/scripts/config-env.sh` to generate a minimal `.env` from secrets before executing Deno tasks.

### Reproducing CI Locally

```bash
deno task fmt:check     # format-check job
deno task lint          # lint-check job
deno task check         # type-check job
deno task test          # unit-test job
deno task build         # build job
```

Run these in order before pushing — CI runs them in the same logical sequence and failures in earlier steps block unit tests.

---

## Dependency Update Workflow (`quality.yml`)

Runs every **Friday at 02:00 UTC** and on `workflow_dispatch`. Creates a PR to `dev` with branch `dependencies/deno-dependency-updates` (auto-deleted after merge).

Commit message pattern: `chore(deps): update dependencies and lock file`

### Note on `zod`
The stable update task excludes `zod` (`!npm:zod`) because it is pinned to `3.23.8` for compatibility. Bump it manually after verifying Danet/zod integration compatibility.

---

## Commit Conventions (Conventional Commits)

```
<type>(<scope>): <short subject>

[optional body]
[optional footer: closes #<issue>]
```

| Type | When |
|------|------|
| `feat` | New feature or behavior |
| `fix` | Bug fix |
| `chore` | Tooling, deps, CI changes |
| `docs` | Documentation only |
| `refactor` | Restructure without behavior change |
| `test` | Test additions or changes |
| `perf` | Performance improvement |

Scope is the module name: `feat(series)`, `fix(jikan)`, `chore(deps)`.

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `dev` | Integration branch — all PRs target here |
| `feature/<issue>-<slug>` | New features (branch from `dev`) |
| `fix/<issue>-<slug>` | Bug fixes (branch from `dev`) |
| `dependencies/deno-dependency-updates` | Auto-managed by quality workflow |

PRs **must** target `dev`. Link the issue number in the PR description.

---

## PR Readiness Checklist

Before opening a PR, confirm:

- [ ] `deno task fmt` — no diff
- [ ] `deno task lint` — no warnings
- [ ] `deno task check` — no type errors
- [ ] `deno task test -- --filter "<module>"` — all tests pass
- [ ] New behavior has tests (happy path + at least one error path)
- [ ] `README.md` or `docs/` updated if public API or behavior changed
- [ ] No secrets committed; `.env.example` updated if new vars required
- [ ] Commit follows Conventional Commits format
- [ ] Issue linked in PR description

---

## Common CI Failure Diagnoses

| Failure | Cause | Fix |
|---------|-------|-----|
| `fmt-check` fails | Code formatting differs | Run `deno task fmt` locally and commit |
| `lint-check` fails | Lint rule violation or cross-module relative import | Fix violations; check `anitrend/only-scoped-imports` |
| `type-check` fails | Type error in entrypoint graph | Run `deno task check`; inspect errors |
| `unit-test` fails | Broken test or missing mock | Run `deno task test -- --filter "<name>"` to isolate |
| `build` fails | Missing permissions or compile error | Run `deno task build` locally |
| Lock file mismatch | `deno.lock` out of sync | Run `deno task cache` and commit updated lock |

---

## Container Build

The `Dockerfile` uses `denoland/deno:2.7.11` as the base image. The compiled binary at `./build/edge` is the production artifact — ensure `deno task build` succeeds locally before pushing a release tag.

OTEL environment variables (`OTEL_EXPORTER_OTLP_ENDPOINT`, etc.) are injected at runtime via Docker Compose or orchestrator config. They are **not** baked into the image.

---

## Optimization Tips

- **Cache Deno in CI**: `cache: true` on `denoland/setup-deno@v2` uses GitHub Actions cache for the Deno binary and module cache. Do not disable this.
- **Target test filters**: Use `deno task test -- --filter "<module>"` in dev; the full suite runs in CI. This saves minutes on large test suites.
- **Parallel jobs**: CI already parallelizes lint, format, and type-check. If adding new jobs, use `needs` only when there is a true dependency.
- **No redundant caching steps**: `deno task cache` should only be added to workflows that change `deno.json` imports (e.g., quality.yml). Regular CI relies on the Deno cache action.
