# Docs Site Implementation Guide

This file documents the Fumadocs integration for `apps/web` and guides future agents through extending the documentation site.

## Quick Start

Before working on the docs site, read these in order:

1. **This file** — you're here
2. **Implementation plan:** `docs/spec/fumadocs-docs-site-plan.md`
3. **Handoff notes:** `docs/spec/fumadocs-docs-site-handoff.md`
4. **Spec:** `docs/spec/fumadocs-docs-site-spec.md`

## Current Status

**Completed tasks (v1):**

- ✓ Task 1 — Fumadocs MDX toolchain
- ✓ Task 2 — Fumadocs source loader
- ✓ Task 3 — shadcn theme + RootProvider
- ✓ Task 4 — `/docs` route + layout
- ✓ Task 5 — MDX components
- ✓ Task 6 — Minimal docs content
- ✓ Task 7 — Landing page integration

**Deferred tasks:**

- Task 8 — Search API (deferred; can be added later)
- Task 10 — Final validation

## Key Documentation

| What                                   | Where                                                                | When to Read                           |
| -------------------------------------- | -------------------------------------------------------------------- | -------------------------------------- |
| Implementation plan & task breakdown   | `docs/spec/fumadocs-docs-site-plan.md`                               | Starting any task on docs site         |
| Handoff notes & task completion status | `docs/spec/fumadocs-docs-site-handoff.md`                            | Before starting a new task             |
| Spec & assumptions                     | `docs/spec/fumadocs-docs-site-spec.md`                               | Understanding the why behind decisions |
| Operator documentation accuracy source | `docs/feature-support.md`                                            | When adding or updating operator docs  |
| Fumadocs TanStack Start guide          | https://www.fumadocs.dev/docs/manual-installation/tanstack-start.mdx | Setting up routes, loaders             |
| Fumadocs MDX Vite setup                | https://www.fumadocs.dev/docs/mdx/vite                               | Working with MDX sources               |
| Fumadocs theme customization           | https://www.fumadocs.dev/docs/ui/theme                               | Modifying colors, fonts, spacing       |

## Skills & Prerequisites

### Before Touching UI

**Always load the shadcn skill before editing any component:**

```bash
pnpm dlx @tanstack/intent@latest load web#shadcn
```

This ensures you follow the shadcn + Tailwind patterns used in the project. Read `SKILL.md` before adding or modifying components.

### Before Starting a New Task

Run the skill check:

```bash
pnpm dlx @tanstack/intent@latest list
```

The output will list applicable skills for the task. For most docs work:

```bash
pnpm dlx @tanstack/intent@latest load web#incremental-implementation
pnpm dlx @tanstack/intent@latest load web#source-driven-development
```

Add `web#shadcn` if the task involves UI components.

## Verification Commands

Use these commands before marking any task complete:

```bash
# Format, lint, typecheck
cd apps/web && vp check

# Build check
vp build

# Typecheck only
pnpm typecheck
```

All three must pass before submitting.

## Project Structure

```
apps/web/
  src/
    components/
      mdx.tsx               # MDX component registry (CodeBlock, InstallCommand, etc)
      mode-toggle.tsx       # Theme toggle (shared across landing + docs)
    lib/
      layout.shared.tsx     # Fumadocs nav config (title, links)
      source.ts             # Fumadocs source loader
    routes/
      __root.tsx            # Root shell (RootProvider wraps app)
      index.tsx             # Landing page (with /docs CTA)
      docs/
        $.tsx               # Docs catch-all route
    styles.css              # Imports Fumadocs + shadcn CSS
  content/
    docs/                   # Hand-written MDX docs
      index.mdx
      getting-started.mdx
      meta.json             # Sidebar structure
      operations/
        hierarchy.mdx
        pattern-matching.mdx
        meta.json
  source.config.ts          # Fumadocs MDX collection config
  vite.config.ts            # Vite + Fumadocs plugin (explicit registration)
```

## Content Accuracy

### Documenting Operators

All operator documentation must be:

1. **Checked against `docs/feature-support.md`** — only document `supported` status operators
2. **Cross-referenced with the spec** — ensure method signatures match package exports
3. **Include TypeScript examples** — use fenced code blocks with `ts` language

**Never document:**

- `planned` operators (coming in future releases)
- `out-of-scope` operators (outside the extension)
- Operators not in `docs/feature-support.md`

### Adding New Pages

1. Create `.mdx` file in `content/docs/` with frontmatter:

   ```yaml
   ---
   title: Page Title
   description: Short description for sidebar
   ---
   ```

2. Update or create `meta.json` in parent directory for sidebar ordering:

   ```json
   {
     "title": "Section Title"
   }
   ```

3. Run `vp check --fix` to format new content

4. Verify the page renders at `/docs/path-to-page` without 404

## Common Tasks

### Adding a New MDX Component

1. Create component in `src/components/` (e.g., `src/components/my-component.tsx`)
2. Import in `src/components/mdx.tsx`
3. Register in `getMDXComponents()` function:
   ```typescript
   MyComponent: MyComponent,
   ```
4. Use in MDX: `<MyComponent prop="value" />`

### Updating Docs Content

1. Edit `.mdx` files in `content/docs/`
2. Cross-check operator claims against `docs/feature-support.md`
3. Run `vp check --fix` to auto-format
4. Test in dev: `pnpm --filter web dev` → navigate to `/docs/your-page`
5. Build to verify: `vp build`

### Changing Theme / Styling

1. Load shadcn skill: `pnpm dlx @tanstack/intent@latest load web#shadcn`
2. Use `pnpm dlx shadcn@latest add <component>` to add new shadcn components
3. Modify `src/styles.css` for global CSS changes
4. Fumadocs CSS variables map to shadcn tokens via `src/styles.css` imports
5. Run `vp check` to verify no CSS conflicts

## Navigation Structure

### Landing Page (`/`)

- Primary CTA: "Get started" → `/docs/getting-started`
- Footer: "Docs" link → `/docs`
- Shared theme toggle (top-right)

### Docs Pages (`/docs/*`)

- Navigation:
  - Title: "prisma-ltree" (clickable → `/docs`)
  - Links: "Home" (→ `/`), "GitHub" (external)
- Sidebar: Auto-generated from `content/docs/` file structure
- Shared theme toggle (top-right)

### Routing

- `/` — Landing page
- `/docs` — Docs root (renders `content/docs/index.mdx`)
- `/docs/getting-started` — Getting started guide
- `/docs/operations/hierarchy` — Hierarchy operators
- `/docs/operations/pattern-matching` — Pattern matching operators
- `/docs/<any>` — Auto-404 if file doesn't exist

## Troubleshooting

### "Cannot assign to this expression" MDX parse error

**Cause:** fumadocs-mdx/vite plugin not explicitly registered in `vite.config.ts`

**Fix:** Ensure `vite.config.ts` has:

```typescript
import { fumadocsMdx } from "fumadocs-mdx/vite";

export default defineConfig({
  plugins: [fumadocsMdx(), tanstackStart()],
});
```

### `.source/` directory not generated

**Cause:** Missing `source.config.ts` or collection is empty

**Fix:**

1. Create/verify `source.config.ts` with `defineDocs({ dir: 'content/docs' })`
2. Ensure `content/docs/index.mdx` exists (collection can't be empty)
3. Restart dev server: `pnpm --filter web dev`

### MDX component not found in render

**Cause:** Component not registered in `mdx.tsx`

**Fix:**

1. Import component in `src/components/mdx.tsx`
2. Add to `getMDXComponents()` return object
3. Restart dev server

### Theme toggle doesn't affect Fumadocs pages

**Cause:** RootProvider not wrapping children in `__root.tsx`

**Fix:**

1. Verify `RootProvider` from `fumadocs-ui/provider/tanstack` is imported
2. Verify children are wrapped: `<RootProvider>{children}</RootProvider>`
3. Verify `ModeToggle` uses `useTheme()` from `fumadocs-ui/provider/base`

## Next Steps

Check `docs/spec/fumadocs-docs-site-handoff.md` for the next task and its acceptance criteria.

Tasks are completed sequentially; do not start multiple tasks in one session unless explicitly asked by the user.

## Skill Checklist

When starting a task, load the appropriate skills:

- **Task 1-2, 4-6:** `incremental-implementation`, `source-driven-development`
- **Task 3, 5, 7:** Add `shadcn` if UI changes
- **Task 8:** `source-driven-development`
- **Task 9:** `documentation-and-adrs`
- **Task 10:** `code-review-and-quality`

Load skills before coding:

```bash
pnpm dlx @tanstack/intent@latest load web#<skill-name>
```
