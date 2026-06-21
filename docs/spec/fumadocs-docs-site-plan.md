# Implementation Plan: Fumadocs Docs Site

**Spec:** [`fumadocs-docs-site-spec.md`](./fumadocs-docs-site-spec.md)
**Handoff:** [`fumadocs-docs-site-handoff.md`](./fumadocs-docs-site-handoff.md) — start here in the next session
**Status:** Approved — **next up: Task 1** (not started)

---

## Overview

Integrate Fumadocs MDX + UI into the existing `apps/web` TanStack Start app. Work in vertical
slices so each session leaves the app buildable. Do **not** attempt all tasks in one session.

### Architecture decisions

| Decision                                  | Rationale                                                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Extend `apps/web`, not new package        | TanStack Start + shadcn already configured                                                                        |
| `/` landing + `/docs/*` docs              | Marketing stays separate from reference docs                                                                      |
| Fumadocs `shadcn.css` preset              | Native theme per [Fumadocs theme docs](https://www.fumadocs.dev/docs/ui/theme)                                    |
| Hand-written MDX v1                       | Smallest path to accurate, minimal docs                                                                           |
| `RootProvider` (TanStack)                 | Required by [Fumadocs TanStack Start guide](https://www.fumadocs.dev/docs/manual-installation/tanstack-start.mdx) |
| Agent shadcn rule in `apps/web/AGENTS.md` | User requirement — prevents incorrect UI patterns                                                                 |

### Dependency graph

```
Task 1 (MDX toolchain)
    │
    ├── Task 2 (source loader + gitignore)
    │       │
    │       ├── Task 3 (RootProvider + shadcn CSS)
    │       │       │
    │       │       └── Task 4 (docs route + layout)
    │       │               │
    │       │               ├── Task 5 (MDX components)
    │       │               │       │
    │       │               │       └── Task 6 (minimal content)
    │       │               │
    │       │               └── Task 7 (landing integration)
    │       │
    │       └── Task 8 (search — optional)
    │
    └── Task 9 (AGENTS.md + agent reminders)
```

---

## Phase 1: Foundation

### Task 1: Add Fumadocs MDX toolchain

**Description:** Install Fumadocs packages and wire the MDX Vite plugin per
[MDX Vite setup](https://www.fumadocs.dev/docs/mdx/vite). Verify `.source/` generates on dev/build.

**Acceptance criteria:**

- [ ] `fumadocs-core`, `fumadocs-ui`, `fumadocs-mdx`, `@types/mdx` added to `apps/web`
- [ ] `apps/web/source.config.ts` defines `defineDocs({ dir: 'content/docs' })`
- [ ] `fumadocs-mdx/vite` plugin added to `vite.config.ts` (before or after `tanstackStart()` — document chosen order)
- [ ] `tsconfig.json` path alias: `"collections/*": ["./.source/*"]`
- [ ] Placeholder `content/docs/index.mdx` exists so collection is non-empty

**Verification:**

- [ ] `pnpm --filter web dev` starts without MDX plugin errors
- [ ] `.source/` directory appears after first dev/build
- [ ] `pnpm --filter web build` succeeds
- [ ] Landing `/` still loads

**Dependencies:** None

**Files likely touched:**

- `apps/web/package.json`
- `apps/web/vite.config.ts`
- `apps/web/source.config.ts`
- `apps/web/tsconfig.json`
- `apps/web/content/docs/index.mdx` (stub)
- `.gitignore` (if `.source/` not already ignored)

**Estimated scope:** Medium (3–5 files)

**Skills:** source-driven-development, incremental-implementation

---

### Task 2: Fumadocs source loader

**Description:** Add `lib/source.ts` integrating the MDX collection with Fumadocs loader
(`baseUrl: '/docs'`).

**Acceptance criteria:**

- [ ] `src/lib/source.ts` exports `source` using `loader({ baseUrl: '/docs', source: docs.toFumadocsSource() })`
- [ ] Imports from `collections/server` resolve
- [ ] `.source/` is gitignored

**Verification:**

- [ ] Typecheck passes: `pnpm --filter web typecheck`
- [ ] No runtime import errors on dev start

**Dependencies:** Task 1

**Files likely touched:**

- `apps/web/src/lib/source.ts`
- `.gitignore`

**Estimated scope:** Small (1–2 files)

**Skills:** source-driven-development

---

### Checkpoint: Foundation

- [ ] `vp run web#build` clean
- [ ] `.source/` generated, not committed
- [ ] Human confirms Vite+ + fumadocs-mdx plugin coexistence is acceptable

---

## Phase 2: UI Integration

### Task 3: shadcn-native Fumadocs theme + RootProvider

**Description:** Integrate Fumadocs UI styles with existing shadcn theme and wrap the app in
Fumadocs TanStack `RootProvider`. Reconcile theme toggling with a single system.

**Acceptance criteria:**

- [ ] `src/styles.css` imports `fumadocs-ui/css/shadcn.css` and `fumadocs-ui/css/preset.css`
- [ ] Existing shadcn CSS variables preserved (base-luma, mono font, `--radius: 0`)
- [ ] `__root.tsx` wraps children with `RootProvider` from `fumadocs-ui/provider/tanstack`
- [ ] `ModeToggle` works with the unified theme API (update or replace custom `ThemeProvider`)
- [ ] No double theme flash on SSR (preserve `suppressHydrationWarning` on `<html>`)

**Verification:**

- [ ] Toggle light/dark on `/` — tokens update correctly
- [ ] `pnpm --filter web build` passes
- [ ] Visual check: docs-specific `--fd-*` colors match shadcn background/foreground

**Dependencies:** Task 2

**Files likely touched:**

- `apps/web/src/styles.css`
- `apps/web/src/routes/__root.tsx`
- `apps/web/src/components/mode-toggle.tsx`
- `apps/web/src/components/theme-provider.tsx` (possibly remove or narrow scope)

**Estimated scope:** Medium

**Skills:** shadcn (read skill before editing UI), source-driven-development, frontend-ui-engineering

**Official sources:**

- https://www.fumadocs.dev/docs/ui/theme
- https://www.fumadocs.dev/docs/manual-installation/tanstack-start.mdx

---

### Task 4: Docs route and layout shell

**Description:** Implement the TanStack Start docs catch-all route and shared layout options per
[Fumadocs TanStack Start guide](https://www.fumadocs.dev/docs/manual-installation/tanstack-start.mdx).

**Acceptance criteria:**

- [ ] `src/lib/layout.shared.tsx` — `baseOptions()` with nav title + GitHub link
- [ ] `src/routes/docs/$.tsx` — server loader + client MDX loader pattern from official guide
- [ ] `src/components/mdx.tsx` — `getMDXComponents` / `useMDXComponents` scaffold (defaults only for now)
- [ ] `/docs` renders `DocsLayout` + page from stub `index.mdx`
- [ ] Unknown slug returns 404

**Verification:**

- [ ] Visit `/docs` in dev — sidebar + MDX body visible
- [ ] Visit `/docs/does-not-exist` — 404
- [ ] `pnpm --filter web build` passes

**Dependencies:** Task 3

**Files likely touched:**

- `apps/web/src/routes/docs/$.tsx`
- `apps/web/src/lib/layout.shared.tsx`
- `apps/web/src/components/mdx.tsx`

**Estimated scope:** Medium

**Skills:** source-driven-development, @tanstack/react-start#react-start (if loader issues)

---

### Checkpoint: UI Integration

- [ ] End-to-end: dev server → `/docs` shows layout
- [ ] Theme works on docs pages
- [ ] Review layout simplicity (no extra tabs/banners unless requested)

---

## Phase 3: Content & MDX

### Task 5: Register MDX components

**Description:** Extend `mdx.tsx` to expose site components for embedding in MDX. Any **new**
shadcn components must be added via shadcn CLI after loading the shadcn skill.

**Acceptance criteria:**

- [ ] `CodeBlock` registered in MDX component map
- [ ] `InstallCommand` registered in MDX component map
- [ ] Optional: `Alert` for callouts — add via `pnpm dlx shadcn@latest add alert` (skill required)
- [ ] Global MDX type augmentation present (`MDXProvidedComponents`)

**Verification:**

- [ ] Temporary test in stub MDX renders `<InstallCommand />` without error
- [ ] Code fences in MDX use Fumadocs default styling

**Dependencies:** Task 4

**Files likely touched:**

- `apps/web/src/components/mdx.tsx`
- Possibly `apps/web/src/components/ui/alert.tsx` (via shadcn CLI)

**Estimated scope:** Small

**Skills:** **shadcn** (mandatory), incremental-implementation

---

### Task 6: Minimal docs content

**Description:** Replace stub with minimal accurate docs. Cross-check every operator claim against
`docs/feature-support.md`.

**Acceptance criteria:**

- [ ] `content/docs/meta.json` defines sidebar order
- [ ] Pages written:
  - `index.mdx` — intro
  - `getting-started.mdx` — install, config, column, db init; uses `<InstallCommand />`
  - `operations/hierarchy.mdx` — ancestor/descendant
  - `operations/pattern-matching.mdx` — lquery operators
  - `operations/meta.json` — subsection label
- [ ] Each page has `title` + `description` frontmatter
- [ ] At least one page uses `<CodeBlock />` or fenced code with real examples from extension README

**Verification:**

- [ ] All sidebar links resolve
- [ ] Content review: no `planned`/`out-of-scope` features listed as supported
- [ ] `pnpm --filter web build` passes (MDX pre-render)

**Dependencies:** Task 5

**Files likely touched:**

- `apps/web/content/docs/**`

**Estimated scope:** Medium (content-heavy, low code risk)

**Skills:** documentation-and-adrs, source-driven-development (feature-support.md)

---

### Task 7: Landing page integration

**Description:** Connect the marketing page to the new docs without rewriting the landing page.

**Acceptance criteria:**

- [ ] Primary CTA ("Get started") links to `/docs/getting-started`
- [ ] Footer or header includes a "Docs" link to `/docs`
- [ ] `ModeToggle` placement works for both landing and docs layouts (avoid duplicate toggles on docs if Fumadocs provides one — pick one UX)

**Verification:**

- [ ] Click-through: `/` → `/docs/getting-started` → operations page
- [ ] Mobile width: nav usable

**Dependencies:** Task 6

**Files likely touched:**

- `apps/web/src/routes/index.tsx`
- `apps/web/src/lib/layout.shared.tsx` (nav links)

**Estimated scope:** Small

**Skills:** frontend-ui-engineering, shadcn (if Button/link patterns change)

---

### Checkpoint: Content

- [ ] Minimal docs complete and accurate
- [ ] MDX component embedding proven
- [ ] Human review of copy and scope

---

## Phase 4: Polish (optional / parallel)

### Task 8: Search API (optional)

**Description:** Add Orama search endpoint per TanStack Start guide. Skip if not needed for v1.

**Acceptance criteria:**

- [ ] `src/routes/api/search.ts` implements `createFromSource(source)`
- [ ] Docs layout search input returns results for "ltree" or "ancestor"

**Verification:**

- [ ] `GET /api/search?q=ancestor` returns JSON hits in dev

**Dependencies:** Task 4

**Estimated scope:** Small

**Skills:** source-driven-development

---

### Task 9: Agent documentation

**Description:** Add `apps/web/AGENTS.md` so future agents follow skills when extending the docs site.

**Acceptance criteria:**

- [ ] File documents: load shadcn skill before UI work
- [ ] File documents: Fumadocs official URLs for TanStack Start + MDX + theme
- [ ] File documents: content accuracy source (`docs/feature-support.md`)
- [ ] File documents: implementation plan location (this file)
- [ ] File documents: verification commands (`vp check`, `vp run web#build`)
- [ ] Root `AGENTS.md` or `CLAUDE.md` links to `apps/web/AGENTS.md` for docs work

**Verification:**

- [ ] Another agent can read AGENTS.md and know which task to pick next

**Dependencies:** Can run in parallel after Task 1; finalize after Task 6

**Files likely touched:**

- `apps/web/AGENTS.md`
- `AGENTS.md` or `CLAUDE.md` (one-line pointer)

**Estimated scope:** Small

**Skills:** documentation-and-adrs, using-agent-skills

---

## Phase 5: Ship readiness

### Task 10: Final validation

**Description:** Full validation pass before calling v1 done.

**Acceptance criteria:**

- [ ] `vp check` passes
- [ ] `vp run web#build` passes
- [ ] Manual browser pass: `/`, `/docs`, dark mode, MDX components
- [ ] No duplicate theme providers or conflicting CSS imports
- [ ] `.source/` not tracked in git

**Verification:**

- [ ] Checklist in spec §11 all checked

**Dependencies:** Tasks 1–7, 9 (and 8 if search included)

**Skills:** code-review-and-quality, browser-testing-with-devtools (optional)

---

## Risks and mitigations

| Risk                                        | Impact | Mitigation                                       |
| ------------------------------------------- | ------ | ------------------------------------------------ |
| Vite+ SSR workaround + Fumadocs SSR loaders | High   | Task 1 spike; test `/docs` early in Task 4       |
| Duplicate theme systems (custom + Fumadocs) | Med    | Task 3 explicitly consolidates; delete dead code |
| fumadocs-mdx plugin order vs tanstackStart  | Med    | Document working order in Task 1 commit message  |
| Agent adds shadcn components incorrectly    | Med    | Task 9 + shadcn skill gate in AGENTS.md          |
| Docs drift from feature matrix              | Med    | Task 6 checklist against feature-support.md      |
| CLAUDE.md says `apps/website/`              | Low    | Update pointer to `apps/web/` in Task 9          |

---

## Session handoff template

When starting a new agent session, paste:

```markdown
## Docs site task

Implement **Task N** from `docs/spec/fumadocs-docs-site-plan.md`.

Before coding:

1. Read `docs/spec/fumadocs-docs-site-spec.md`
2. Load skills: incremental-implementation, source-driven-development
3. If touching UI: load `.agents/skills/shadcn/SKILL.md`

After coding:

- Run verification steps listed for Task N
- Do not start the next task in the same session unless explicitly asked
```

---

## Suggested commit sequence

| Commit | Task   | Message idea                                                |
| ------ | ------ | ----------------------------------------------------------- |
| 1      | Task 1 | chore(web): add fumadocs-mdx toolchain                      |
| 2      | Task 2 | chore(web): wire fumadocs source loader                     |
| 3      | Task 3 | feat(web): integrate fumadocs shadcn theme and RootProvider |
| 4      | Task 4 | feat(web): add /docs route and layout                       |
| 5      | Task 5 | feat(web): register MDX components                          |
| 6      | Task 6 | docs(web): add minimal mdx documentation pages              |
| 7      | Task 7 | feat(web): link landing page to docs                        |
| 8      | Task 8 | feat(web): add docs search api (optional)                   |
| 9      | Task 9 | docs(web): add AGENTS.md for docs site contributors         |

---

## Human decisions (2026-06-20)

| Item                  | Decision                           |
| --------------------- | ---------------------------------- |
| Assumptions (spec §2) | Approved                           |
| Search (Task 8)       | Deferred — not v1                  |
| Landing CTA (Task 7)  | Yes → `/docs/getting-started`      |
| Start Task 1          | **Next session** (see handoff doc) |
