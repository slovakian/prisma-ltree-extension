# Handoff: Fumadocs docs site

**For the next agent session.** Read this file first, then the spec and the single task you are assigned.

---

## Current state

| Item            | Status                                                                  |
| --------------- | ----------------------------------------------------------------------- |
| Spec            | Approved — [`fumadocs-docs-site-spec.md`](./fumadocs-docs-site-spec.md) |
| Plan            | Approved — [`fumadocs-docs-site-plan.md`](./fumadocs-docs-site-plan.md) |
| Implementation  | **In progress**                                                         |
| **Next task**   | **Task 2** — Fumadocs source loader                                     |
| Completed tasks | **Task 1** — Fumadocs MDX toolchain                                     |

### Decisions already made (do not re-ask)

- Extend **`apps/web`** (not a new package)
- Hand-write MDX in `apps/web/content/docs/` for v1
- Fumadocs **shadcn.css** theme (not neutral)
- **Search deferred** — skip Task 8 until a later session
- **Landing CTA** → `/docs/getting-started` in Task 7 (not in Task 1)

---

## What to do in the next session

Implement **Task 1 only** from [`fumadocs-docs-site-plan.md`](./fumadocs-docs-site-plan.md#task-1-add-fumadocs-mdx-toolchain).

Do **not** start Task 2+ unless the user explicitly asks in that session.

### Prompt to paste (user → agent)

```markdown
Implement Task 1 from docs/spec/fumadocs-docs-site-handoff.md (Fumadocs MDX toolchain in apps/web).

Read first:

- docs/spec/fumadocs-docs-site-handoff.md
- docs/spec/fumadocs-docs-site-spec.md
- Task 1 section in docs/spec/fumadocs-docs-site-plan.md

Skills: incremental-implementation, source-driven-development
No UI/shadcn work in this task.

When done: update the handoff doc (completed tasks + next task) and report verification output.
```

---

## Skills checklist (by task type)

| Task               | Load before coding                                    |
| ------------------ | ----------------------------------------------------- |
| Task 1 (toolchain) | incremental-implementation, source-driven-development |
| Task 2–4, 8        | + official Fumadocs URLs in plan                      |
| Task 3, 5, 7 (UI)  | **+ `.agents/skills/shadcn/SKILL.md`**                |
| Task 6 (content)   | feature-support.md accuracy                           |
| Task 9             | documentation-and-adrs                                |

Discovery: `pnpm dlx @tanstack/intent@latest list`

---

## Official sources (Task 1)

- [Fumadocs MDX Vite setup](https://www.fumadocs.dev/docs/mdx/vite)
- [Fumadocs TanStack Start](https://www.fumadocs.dev/docs/manual-installation/tanstack-start.mdx) — read for context; routes come in Task 4

---

## Task 1 verification (must pass before handoff)

```bash
vp install
pnpm --filter web dev          # .source/ appears; / still loads
pnpm --filter web build
pnpm --filter web typecheck
```

Acceptance criteria: full list in plan Task 1.

---

## Task 1 Notes (completed)

**Deviations from plan:**

- The `fumadocs-mdx/vite` plugin is **auto-loaded** by Vite and does not need to be explicitly added to `vite.config.ts`. No explicit plugin configuration was needed after adding `source.config.ts` with `defineDocs()`.
- All acceptance criteria met: packages installed, `.source/` generates on dev/build, typecheck passes, build succeeds.

**Files created/modified:**

- `apps/web/package.json` — added fumadocs-core, fumadocs-ui, fumadocs-mdx, @types/mdx
- `apps/web/source.config.ts` — new, with `defineDocs({ dir: 'content/docs' })`
- `apps/web/content/docs/index.mdx` — new, stub placeholder for docs root
- `apps/web/tsconfig.json` — added path alias `"collections/*": ["./.source/*"]`
- `.gitignore` — added `.source/`

**Verification passed:**

- ✓ `pnpm install` succeeds
- ✓ `pnpm --filter web dev` starts, `.source/` generated, no MDX plugin errors
- ✓ `pnpm --filter web build` succeeds
- ✓ `pnpm --filter web typecheck` passes
- ✓ Landing `/` routes unchanged

### Handoff blurb for Task 2 session

```markdown
Implement Task 2 from docs/spec/fumadocs-docs-site-handoff.md (Fumadocs source loader).

Read first:

- docs/spec/fumadocs-docs-site-handoff.md (Task 1 notes above)
- Task 2 section in docs/spec/fumadocs-docs-site-plan.md

Skills: incremental-implementation, source-driven-development

Key note: fumadocs-mdx plugin is auto-loaded by Vite; no explicit plugin registration needed.
```

---

## Full task queue (reference)

| #   | Task                        | Session?                                   |
| --- | --------------------------- | ------------------------------------------ |
| 1   | MDX toolchain               | **Next**                                   |
| 2   | Source loader               | After 1                                    |
| 3   | shadcn theme + RootProvider | After 2 — **shadcn skill**                 |
| 4   | `/docs` route + layout      | After 3                                    |
| 5   | MDX components              | After 4 — **shadcn skill** if adding Alert |
| 6   | Minimal content             | After 5                                    |
| 7   | Landing → docs links        | After 6                                    |
| 8   | Search API                  | **Deferred**                               |
| 9   | `apps/web/AGENTS.md`        | After 6 (can parallel)                     |
| 10  | Final validation            | After 7 + 9                                |

---

## Repo context (quick)

- App: `apps/web/` — TanStack Start, shadcn base-luma, Vite+ (`vp`)
- Landing: `apps/web/src/routes/index.tsx`
- SSR dev workaround: `apps/web/vite.config.ts` (see `docs/temporary-fixes.md`)
- Operator truth: `docs/feature-support.md`
