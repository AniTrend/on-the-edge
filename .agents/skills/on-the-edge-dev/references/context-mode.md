# Context-Mode Reference Map

## Non-Negotiable Search Order

Use context-mode first for repo research, history lookup, and output processing.

1. Start with `mcp_context-mode_ctx_search` in `sort: "timeline"` mode when you need prior
   session or repo context.
2. Use `mcp_context-mode_ctx_batch_execute` for multi-file discovery, command batches, and large
   outputs that would otherwise flood the chat.
3. Use `mcp_context-mode_ctx_search` for focused follow-up questions after the initial gather.
4. Use `mcp_context-mode_ctx_execute` or `mcp_context-mode_ctx_execute_file` when you need
   analysis, counting, filtering, or structured processing.
5. Read a file directly only when you already know the exact file you need to edit.
6. Write files only with native edit tools such as `apply_patch`.

## Repository Instruction Map

The repository already has a narrow set of instruction files. Load the smallest matching file
after context-mode has established the starting point.

| File | Use For |
| ---- | ------- |
| `AGENTS.md` | Project-level entry point and repo-wide conventions |
| `.github/instructions/context.instructions.md` | Repository-wide Deno, testing, structure, and safety rules |
| `.github/instructions/*.instructions.md` | Module-specific rules for `src/**` subtrees |
| `./references/libraries.md` | Package docs, import aliases, and framework usage |
| `./references/deno-practices.md` | Deno tasks, permissions, import conventions, and runtime details |
| `./references/security-performance.md` | Secrets, validation, logging, caching, pagination, and remote-call hygiene |
| `./references/cicd.md` | CI, release, and dependency update workflows |

## When To Refresh This Map

Update this file whenever a new instruction file, skill reference, or repo-level workflow changes
where the first research step should go. Keep the map short, current, and opinionated.

## What Not To Do

- Do not start with raw `grep`, `find`, `cat`, or generic file scans.
- Do not use web fetches before you have a local repo hypothesis.
- Do not skip the timeline search when resuming a partially completed task.
- Do not load every reference file at once.
