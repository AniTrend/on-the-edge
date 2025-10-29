# Task Completion Checklist
- Run `deno fmt` and `deno lint` to satisfy formatting and linting gates.
- Execute targeted `deno task test --filter <pattern>` or full `deno task test`; ensure deterministic coverage results.
- Update relevant docs/README when public behavior changes or new flags/secrets introduced.
- Verify DI wiring and module exports (`deno.json` workspace exports) when adding services/controllers.
- Review logging/tracing impact; avoid leaking secrets.
- Prepare commits/PRs with single logical change, summarizing risk and validation steps.