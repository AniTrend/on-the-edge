# Cross-Package Import Refactor Plan

## Goals
- Eliminate relative imports that traverse package boundaries under `src/**`.
- Ensure every cross-package import uses its scoped alias as defined in each package's `deno.json`.
- Expose any missing public APIs required to support alias-based imports.
- Keep `anitrend/no-cross-package-relative-imports` lint rule passing as the enforcement mechanism.

## Workflow Overview
1. **Run the lint rule regularly**
   - Command: `deno lint`
   - Capture reported files/specifiers and use the list as the to-do queue.

2. **Verify package export surfaces**
   - Check `src/<package>/deno.json` and corresponding `index.ts` re-export structure.
   - Add or adjust exports so paths like `@scope/service/tmdb` expose the needed symbols.
   - Prefer package-root exports; only expose deeper subpaths when required.

3. **Replace flagged imports iteratively**
   - Work module-by-module (e.g., `episodes`, then `series`).
   - Swap each relative specifier for its `@scope/<package>/<entry>` alias.
   - Strip trailing `/index` segments in replacements to align with public exports.
   - If the target module belongs to the same package ("self" imports), keep the relative path.

4. **Handle special cases**
   - For deeply nested utilities, expose the symbol via the package surface or adjust call sites to consume an existing export. Example: if a file imports `../../../service/tmdb/transformer/provider.ts`, first add `export * from './transformer/index.ts';` to `src/service/tmdb/index.ts` (and update `src/service/deno.json` if a subpath export is needed), then replace the import with `@scope/service/tmdb`. If a feature legitimately consumes a sub-module (e.g., `../../../service/thexem/remote/client.ts`), add an explicit export entry like `"./thexem/remote": "./thexem/remote/index.ts"` so callers can switch to `@scope/service/thexem/remote`.
   - Document any intentional exceptions with TODO comments and follow up once a public export is available.

5. **Continuous validation**
   - After each batch of updates, re-run the lint command; ensure the diagnostic count trends toward zero.
   - Run `deno fmt` to keep formatting consistent.
   - Execute focused tests (`deno task test --filter episodes | series | service`, etc.) to confirm behavior remains intact.

## Tracking Progress
- Maintain a checklist (in issues or PR description) of files already fixed.
- Note any added exports or refactors required to support alias use.
- Keep the lint command output history to show progressive improvement.

## Completion Criteria
- `deno lint` reports no violations.
- All cross-package imports use the appropriate `@scope/*` alias.
- Package export maps and indexes expose the symbols consumed across modules.
- Tests covering affected areas continue to pass.
