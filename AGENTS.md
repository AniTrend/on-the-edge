# Repository Guidelines

## Project Structure & Module Organization
The edge runtime entrypoint is `src/mod.ts`. Domain modules live under `src/common`, `src/episodes`, `src/series`, `src/service`, and `src/news`, each containing implementations and co-located `.test.ts` files. Shared documentation lives in `docs/`, configuration helpers are in `src/config`, and coverage reports are written to `coverage/` when tests run. Docker, Compose, and workspace settings at the repo root support container builds and the provided VS Code setup.

## Build, Test, and Development Commands
- `deno task start` boots the edge server with OpenTelemetry flags for local smoke testing.
- `deno task check` performs a full type check beginning at `src/mod.ts`.
- `deno task test` runs the suite and outputs coverage artifacts to `coverage/`.
- `deno task build` compiles a standalone binary at `build/on-the-edge` for deployment testing.

## Coding Style & Naming Conventions
Formatting and linting are managed by Deno (`deno fmt`, `deno lint`) using the settings in `deno.json`. Use two-space indentation, an 80-character max line width, and single quotes; run `deno fmt src` before committing. File names follow dotted descriptors (for example, `episodes.controller.ts`), while tests mirror the target module as `<name>.test.ts`.

## Testing Guidelines
Unit tests rely on Deno's builtin runner plus helpers from `docs/testing-utilities.md`; prefer stubs over live service calls. Organize fixtures alongside the domain under test (`src/episodes/tests/`, `src/service/jikan/`). Write descriptive test names that capture behavior and favor scenario-based `Deno.test({ name: "..." })` blocks. After updates, run `deno task test` and review coverage to ensure it does not regress.

## Commit & Pull Request Guidelines
Commits follow the conventional prefixes used in history (`chore:`, `ci(workflow):`, `feat:`) and should reference related issues in the body. Branch names should mirror the tracked work, such as `feature/106-add-new-fancy-feature`, and keep the scope focused. Pull requests need a clear summary, linked issue, evidence of `deno task check` and `deno task test`, and screenshots or logs whenever behavior changes.

## Configuration Tips
To exercise observability locally, export `OTEL_DENO_SERVICE_NAME` and the OTLP endpoint variables described in `README.md` before running `deno task start`; omit them to disable telemetry. Keep `.env` files out of version control and rely on the permission presets in `deno.json` when adding new scripts or tasks.
