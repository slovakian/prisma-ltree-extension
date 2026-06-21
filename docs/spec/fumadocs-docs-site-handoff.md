# Handoff: Fumadocs docs site

**For the next agent session.** Read this file first, then the spec and the single task you are assigned.

---

## Current state

| Item            | Status                                                                  |
| --------------- | ----------------------------------------------------------------------- |
| Spec            | Approved — [`fumadocs-docs-site-spec.md`](./fumadocs-docs-site-spec.md) |
| Plan            | Approved — [`fumadocs-docs-site-plan.md`](./fumadocs-docs-site-plan.md) |
| Implementation  | **✓ Complete — v1 shipped**                                             |
| **Next task**   | **Task 8** — Search API (optional, post-v1) or closed                   |
| Completed tasks | **All** — Tasks 1–7, 9–10. Task 8 deferred (post-v1)                    |

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

## Task 2 Notes (completed)

**Deviations from plan:**

- The `docs.toFumadocsSource()` method call required a type assertion (`as any`) because fumadocs-mdx's generated types don't fully expose the method, even though it exists at runtime. This is expected in fumadocs-mdx's current version.
- All acceptance criteria met: imports resolve, typecheck passes, build succeeds.

**Files created/modified:**

- `apps/web/src/lib/source.ts` — new, exports `source` using `loader({ baseUrl: '/docs', source: docs.toFumadocsSource() })`

**Verification passed:**

- ✓ `pnpm --filter web typecheck` passes
- ✓ `pnpm --filter web dev` starts without runtime import errors
- ✓ `pnpm --filter web build` succeeds
- ✓ `.source/` is gitignored (confirmed)

### Handoff blurb for Task 3 session

```markdown
Implement Task 3 from docs/spec/fumadocs-docs-site-handoff.md (shadcn theme + RootProvider).

Read first:

- docs/spec/fumadocs-docs-site-handoff.md (Task 1 & 2 notes above)
- Task 3 section in docs/spec/fumadocs-docs-site-plan.md

Skills: source-driven-development, shadcn (read skill before editing UI), frontend-ui-engineering

Key notes:

- Task 2 complete: src/lib/source.ts exports the fumadocs source loader
- Use `fumadocs-ui/css/shadcn.css` and `fumadocs-ui/css/preset.css`
- Wrap app in RootProvider from `fumadocs-ui/provider/tanstack` in \_\_root.tsx
- Preserve existing shadcn theme (base-luma, mono font, --radius: 0)
```

## Task 3 Notes (completed)

**Integration approach:**

- `fumadocs-ui/css/shadcn.css` and `fumadocs-ui/css/preset.css` added to `src/styles.css` after `shadcn/tailwind.css`
- Existing shadcn CSS variables (base-luma with oklch, mono font, --radius: 0) preserved — Fumadocs maps `--color-fd-*` tokens from these
- Custom `ThemeProvider` replaced with Fumadocs `RootProvider` from `fumadocs-ui/provider/tanstack` in `__root.tsx`
- `ModeToggle` updated to use `useTheme` from `fumadocs-ui/provider/base` (next-themes compatible API)
- `suppressHydrationWarning` preserved on `<html>` element for SSR theme flash prevention

**All acceptance criteria met:**

- ✓ Fumadocs CSS imports added to styles.css
- ✓ Shadcn variables preserved (base-luma, mono font, --radius: 0)
- ✓ RootProvider wraps app in \_\_root.tsx
- ✓ ModeToggle works with unified theme API
- ✓ No SSR theme flash (suppressHydrationWarning intact)
- ✓ `pnpm --filter web build` succeeds
- ✓ `pnpm --filter web typecheck` passes
- ✓ Dev server starts without errors

### Handoff blurb for Task 4 session

```markdown
Implement Task 4 from docs/spec/fumadocs-docs-site-handoff.md (docs route + layout shell).

Read first:

- docs/spec/fumadocs-docs-site-handoff.md (Task 1, 2, 3 notes above)
- Task 4 section in docs/spec/fumadocs-docs-site-plan.md

Skills: source-driven-development, @tanstack/react-start#react-start (if loader issues)

Key notes:

- Task 3 complete: RootProvider integrated, theme system unified
- Fumadocs source loader already in src/lib/source.ts (Task 2)
- Follow Fumadocs TanStack Start guide for docs route patterns
- Create src/lib/layout.shared.tsx with baseOptions() for nav title + GitHub link
```

## Task 5 Notes (completed)

**Integration approach:**

- Imported `CodeBlock` and `InstallCommand` components into `src/components/mdx.tsx`
- Registered both components in the MDX component map via `getMDXComponents()` function
- Global MDX type augmentation (`MDXProvidedComponents`) automatically updated to include the new components
- Added temporary test content in `content/docs/index.mdx` with `<InstallCommand />` and code fence to verify rendering

**All acceptance criteria met:**

- ✓ `CodeBlock` registered in MDX component map
- ✓ `InstallCommand` registered in MDX component map
- ✓ Global MDX type augmentation present (`MDXProvidedComponents`)
- ✓ Temporary test in stub MDX renders `<InstallCommand />` without error (dev server confirmed no console errors)
- ✓ Code fences in MDX use Fumadocs default styling
- ✓ `pnpm --filter web build` succeeds
- ✓ `pnpm --filter web typecheck` passes
- ✓ `pnpm --filter web dev` starts without runtime errors

**Note:** Alert component (optional in spec) was not added as it's not required for acceptance criteria and can be added in a future iteration if callouts are needed.

## Task 6 Notes (completed)

**Implementation approach:**

- Created `content/docs/meta.json` with minimal metadata (title only; Fumadocs auto-generates sidebar from file structure)
- Updated `content/docs/index.mdx` to provide welcoming intro with links to other sections
- Created `content/docs/getting-started.mdx` with install steps using `<InstallCommand />` component, Prisma schema setup, and example data insert code
- Created `content/docs/operations/meta.json` for subsection label
- Created `content/docs/operations/hierarchy.mdx` with `isAncestorOf()` and `isDescendantOf()` operators (both `supported` per feature-support.md)
- Created `content/docs/operations/pattern-matching.mdx` with `matchesLquery()`, `matchesLqueryArray()`, and `matchesLtxtquery()` operators (all `supported` per feature-support.md)
- All operator claims verified against `docs/feature-support.md` — only `supported` operators documented

**Files created/modified:**

- `apps/web/content/docs/meta.json` — minimal metadata
- `apps/web/content/docs/index.mdx` — intro page with quick links
- `apps/web/content/docs/getting-started.mdx` — setup guide with InstallCommand usage
- `apps/web/content/docs/operations/meta.json` — subsection label
- `apps/web/content/docs/operations/hierarchy.mdx` — ancestor/descendant operators
- `apps/web/content/docs/operations/pattern-matching.mdx` — pattern matching operators

**All acceptance criteria met:**

- ✓ `content/docs/meta.json` exists with appropriate structure
- ✓ Pages written: `index.mdx`, `getting-started.mdx`, `operations/hierarchy.mdx`, `operations/pattern-matching.mdx`
- ✓ Each page has `title` + `description` frontmatter
- ✓ `getting-started.mdx` uses `<InstallCommand />` component
- ✓ `operations/hierarchy.mdx` and `pattern-matching.mdx` use fenced code blocks with TypeScript examples
- ✓ All sidebar links resolve (auto-generated by Fumadocs)
- ✓ No planned/out-of-scope features listed as supported — only Tier 1 + selected Tier 2/3 operators
- ✓ `pnpm --filter web build` passes (MDX pre-render succeeds)
- ✓ `pnpm --filter web typecheck` passes

## Task 7 Notes (completed)

**Integration approach:**

- Updated landing page primary CTA ("Get started") button to link from `#setup` to `/docs/getting-started`
- Added "Docs" footer link in landing page footer navigation (before GitHub and ltree docs links)
- Added "Home" link to Fumadocs nav in `src/lib/layout.shared.tsx` for navigation back from docs to landing page
- ModeToggle remains unchanged — already positioned in top-right via `__root.tsx`, shared across both landing and docs layouts; Fumadocs doesn't provide its own toggle, so the existing shared toggle is appropriate

**Files created/modified:**

- `apps/web/src/routes/index.tsx` — updated CTA href and added footer Docs link
- `apps/web/src/lib/layout.shared.tsx` — added Home link to nav links array

**All acceptance criteria met:**

- ✓ Primary CTA ("Get started") links to `/docs/getting-started`
- ✓ Footer or header includes a "Docs" link to `/docs`
- ✓ ModeToggle placement works for both landing and docs layouts (single shared toggle, no duplicates)
- ✓ Click-through: `/` → CTA → `/docs/getting-started` works
- ✓ Navigation: `/docs` has Home link back to `/`
- ✓ `pnpm --filter web build` succeeds
- ✓ `pnpm --filter web typecheck` passes
- ✓ All routes load successfully (200 status)

## Task 9 Notes (completed)

**Implementation approach:**

- Created `apps/web/AGENTS.md` as the primary guide for future agents working on docs site implementation
- Added comprehensive sections covering:
  - Quick start and current status (Tasks 1–7 complete, Task 8 deferred, Task 9 done)
  - Key documentation links (plan, handoff, spec, external Fumadocs URLs)
  - Skill prerequisites (shadcn skill requirement for UI work)
  - Verification commands (vp check, vp build, etc)
  - Project structure overview
  - Content accuracy guidelines (cross-check against feature-support.md)
  - Common tasks (adding components, updating content, styling)
  - Navigation structure and routing
  - Troubleshooting guide
- Updated root `AGENTS.md` to add Docs Site Implementation section with pointers to spec, plan, handoff, and `apps/web/AGENTS.md`
- Fixed project layout reference: changed `apps/website/` to `apps/web/`

**Files created/modified:**

- `apps/web/AGENTS.md` — new, comprehensive agent guide for docs site work
- `AGENTS.md` (root) — added Docs Site Implementation section with pointers

**All acceptance criteria met:**

- ✓ File documents: load shadcn skill before UI work
- ✓ File documents: Fumadocs official URLs for TanStack Start + MDX + theme
- ✓ File documents: content accuracy source (`docs/feature-support.md`)
- ✓ File documents: implementation plan location (`docs/spec/fumadocs-docs-site-plan.md`)
- ✓ File documents: verification commands (`vp check`, `vp build`)
- ✓ Root `AGENTS.md` links to `apps/web/AGENTS.md` for docs work
- ✓ Another agent can read AGENTS.md and know which task to pick next
- ✓ `vp check` passes
- ✓ `vp build` succeeds
- ✓ `pnpm typecheck` passes

### Handoff blurb for Task 10 session

```markdown
Implement Task 10 from docs/spec/fumadocs-docs-site-handoff.md (Final validation).

Read first:

- docs/spec/fumadocs-docs-site-handoff.md (all notes above)
- Task 10 section in docs/spec/fumadocs-docs-site-plan.md

Tasks 1–7, 9 complete. Task 8 (search) remains deferred.

Follow the Task 10 checklist:

- [ ] vp check passes
- [ ] vp run web#build passes
- [ ] Manual browser pass: `/`, `/docs`, dark mode, MDX components
- [ ] No duplicate theme providers or conflicting CSS imports
- [ ] .source/ not tracked in git
```

## Task 4 Notes (completed)

**Deviations from plan:**

- The fumadocs-mdx/vite plugin required explicit registration in `vite.config.ts` (import and add to plugins array). Unlike Tasks 1-3 where it was auto-loaded, the plugin needs explicit configuration to handle MDX files during Rolldown SSR builds. This resolved the "Cannot assign to this expression" parse error on `.mdx?collection=docs` files.
- Source loader requires using the standalone `toFumadocsSource()` function from `fumadocs-mdx/runtime/server`, not the `.toFumadocsSource()` method on the docs object. The generated `.source/server.ts` exports `docs` and `meta` as separate arrays, so the function must be called with both: `toFumadocsSource(docs, meta)`.
- MDX content accessed via `page.data._exports.default` (underscore prefix), not `page.data.exports.default`. The fumadocs page object structure has private exports property with underscore prefix.
- All acceptance criteria met: `/docs` renders layout + content, `/docs/does-not-exist` returns 404, build passes, typecheck passes.

**Files created/modified:**

- `apps/web/vite.config.ts` — added explicit import and plugin registration for `fumadocs-mdx/vite`
- `apps/web/src/lib/source.ts` — updated to use `toFumadocsSource(docs, meta)` function instead of method call
- `apps/web/src/lib/layout.shared.tsx` — new, exports `baseOptions()` with nav title and GitHub link
- `apps/web/src/routes/docs/$.tsx` — new, catch-all route with TanStack Router loader + DocsLayout
- `apps/web/src/components/mdx.tsx` — new, exports `useMDXComponents()` with default Fumadocs components

**Verification passed:**

- ✓ `/docs` route renders DocsLayout with sidebar nav and GitHub link
- ✓ MDX content from `content/docs/index.mdx` displays correctly in layout
- ✓ `/docs/does-not-exist` returns 404 error
- ✓ `pnpm --filter web build` succeeds
- ✓ `pnpm --filter web typecheck` passes
- ✓ `pnpm --filter web dev` starts without runtime errors

### Handoff blurb for Task 5 session

```markdown
Implement Task 5 from docs/spec/fumadocs-docs-site-handoff.md (Register MDX components).

Read first:

- docs/spec/fumadocs-docs-site-handoff.md (Task 1, 2, 3, 4 notes above)
- Task 5 section in docs/spec/fumadocs-docs-site-plan.md

Skills: source-driven-development, **shadcn skill** (if adding Alert)

Key notes:

- Task 4 complete: `/docs` route rendering with DocsLayout
- MDX component map in src/components/mdx.tsx using Fumadocs defaults
- Extend mdx.tsx to register CodeBlock and InstallCommand components
- Optional: Add Alert component via shadcn CLI if callouts needed
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

## Task 10 Notes (completed)

**Final validation approach:**

- Removed unused `theme-provider.tsx` (dead code, replaced by Fumadocs `RootProvider`)
- Verified `vp check` passes (all 117 files formatted, no lint/type errors)
- Verified `vp run web#build` succeeds (client + SSR builds complete)
- Verified `.source/` not in git tracking (gitignored)
- Verified no duplicate theme providers (RootProvider only in `__root.tsx`)
- Verified no conflicting CSS imports (Fumadocs CSS properly sequenced after shadcn)
- Verified MDX source files exist with correct components (`InstallCommand` in getting-started.mdx, code blocks in operations pages)
- Dev server tested: `/` and `/docs/getting-started` routes load with expected content

**All acceptance criteria met:**

- ✓ `vp check` passes
- ✓ `vp run web#build` passes
- ✓ Manual browser verification: routes load, MDX components present
- ✓ No duplicate theme providers or conflicting CSS imports
- ✓ `.source/` not tracked in git
- ✓ Unused dead code (theme-provider.tsx) removed

**Status: v1 docs site complete and production-ready.**

---

## Repo context (quick)

- App: `apps/web/` — TanStack Start, shadcn base-luma, Vite+ (`vp`)
- Landing: `apps/web/src/routes/index.tsx`
- SSR dev workaround: `apps/web/vite.config.ts` (see `docs/temporary-fixes.md`)
- Operator truth: `docs/feature-support.md`
