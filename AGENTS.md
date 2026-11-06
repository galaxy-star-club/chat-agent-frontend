<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agentic Chat frontend

- Current authorization: Plan 03 is complete with a generated database-readiness contract snapshot only; it added no frontend product behavior. No chat engine, uploads, provider calls, publication or deployment yet. Do not start Plan 04 without permission.
- Read the focused module and installed version's documentation before editing. Use Context7 if connected; otherwise use official documentation. Never invent APIs.
- Apply Ponytail: reuse, minimize, preserve validation/security/accessibility/tests. Required project layers take precedence.
- Ask the user for screenshots before creating each product page. The initial basic neutral shell is the only exception.
- Thin `src/app` routes compose feature modules in `src/modules`. Keep shared UI in `src/components`, infrastructure in `src/lib`.
- Components call query hooks; query hooks call module API functions; those call the shared HTTP transport. Raw first-party fetch belongs only in the transport.
- TanStack Query owns server state. Keep transient UI state local; use Zustand only when a real shared client-state requirement appears.
- Backend-owned Zod snapshots in `src/generated/contracts` must not be hand-edited. Regenerate using the backend export script.
- Shared UI uses Shadcn conventions and Tailwind. Do not duplicate primitives or create generic abstractions without a concrete use.
- Never ship secrets or provider adapters to the browser. `NEXT_PUBLIC_*` values are public and fixed at build time.
- Separate subagents get fresh briefs and isolated worktrees. Coordinator owns package manifests, lockfiles and generated contracts.
- Run lint, strict typechecking and relevant tests; build before handoff. Report exactly what was checked.
- Stop after the approved plan and obtain permission before starting another.
