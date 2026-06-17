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
- Aim for meaningful coverage; CI mirrors `deno fmt --check`, `deno lint`, `deno task check`, `deno task test`, and `deno task build`, so the local equivalents must pass before committing.

## Commit & Pull Request Guidelines
- Follow Conventional Commits: `feat(scope): subject`, `fix(experiment): adjust typings`.
- Branch from `dev` using `feature/123-brief-title` or `fix/456-bug-title`; PRs should target `dev` and link issues.
- Include tests, update docs when behavior changes, and before committing run the same quality gates enforced in `.github/workflows/ci.yml`: `bash .github/scripts/config-env.sh`, `deno fmt --check`, `deno lint`, `deno task check`, `deno task test`, and `deno task build`.

## Security & Configuration
- Configure via `.env` (copy from `.env.example`); never commit secrets.
- For observability, set OTEL env vars if exporting traces/metrics/logs.

## OpenAPI Contract Rules (Critical)

The generated `swagger-spec.json` is the source contract consumed by `edge-graphql` (GraphQL Mesh → `anitrend-v2` Android). **Every API change must keep the contract valid.**

### Centralized Zod Instance
- Import `z` from `@scope/common/openapi` in all **contract** and **swagger** files.
- Never call `extendZodWithOpenApi(z)` outside of `src/common/openapi/zod.ts`.
- Import `z` from `zod` directly only in runtime/domain **schema** files (`*.schema.ts`) that need no OpenAPI metadata.

### Schema File Conventions
```
src/package/<domain>/
  <domain>.schema.ts       // runtime validation (zod, preprocessors, coercion)
  <domain>.contract.ts     // public OpenAPI contract (z from @scope/common/openapi, explicit .openapi(), .nullable().optional())
  <domain>.swagger.ts      // re-exports from contract, query swagger wrappers
```

### Public Contract Schemas (`*.contract.ts`)
- Every public nested model must have an explicit `.openapi({ title: 'PascalCase', description: '...' })` call.
- Use `.nullable().optional()` instead of `.nullish()` for OpenAPI 3.0 compatibility.
- Replace `z.custom<T>()` with explicit `z.enum([...])` or `z.string()` in contracts.

### Query Schemas
- **Every `@Query()` schema must have `.openapi()` metadata.** Otherwise the generator produces `undefined` component names.
- Export query swagger wrappers from `*.swagger.ts`:
  ```ts
  // deno-lint-ignore no-explicit-any
  export const <Domain>QuerySwagger = (<Domain>QuerySchema as any).openapi({
    title: '<Domain>Query',
    description: '...',
  });
  ```
- Controllers must import and use the swagger-decorated query schema in `@Query()`.

### Adding a New Endpoint
1. Create/update `*.contract.ts` with named `.openapi()` schemas for all response types.
2. Create/update `*.swagger.ts` with re-exports from the contract + query swagger wrapper.
3. Add the new schema title to `EXPECTED_SCHEMA_NAMES` in `src/common/openapi/names.ts`.
4. Add the new operation ID to `EXPECTED_OPERATION_IDS` in the same file.
5. Use `@ReturnedSchema(SwaggerExport)` and `@Query(QuerySwaggerExport)` in the controller.

### Contract Validation Pipeline
```
SwaggerModule.createDocument() → normalizeOpenApiDocument() → assertOpenApiContract() → write spec
```
The normalizer converts JSON Schema `type` arrays to OpenAPI 3.0 `nullable`.
The guard rejects: `undefined` schema names, inline 200 response objects without `$ref`, remaining `type` arrays, missing expected schemas/operation IDs, missing `components.schemas` or `paths`.

### CI Enforcement
- `contract-check` job runs `swagger:generate` + `swagger:validate` with MongoDB/Redis services.
- Swagger generation is **fail-fast** — no `continue-on-error` anywhere.
- A failing contract check blocks merge.
