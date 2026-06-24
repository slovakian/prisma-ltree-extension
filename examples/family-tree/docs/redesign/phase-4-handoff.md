# Handoff → Phase 4: Side panel (detail card)

You are the agent picking up **Phase 4** of the Tree-of-Life visual redesign.
Phase 1 (tokens + fonts), Phase 2 (hairline dendrogram canvas + diamond/portrait
nodes), and Phase 3 (floating title overlay + corner hint chrome) are **done and
committed**. Read these first, in order:

1. [`redesign-spec.md`](./redesign-spec.md) — the target feel, palette, type, and
   hard constraints. **§3.1 (type moves: mono kicker → serif name → hairline rule
   → italic blurb)**, **§3.2 (palette; conservation-status dots)**, **§3.3
   (hairlines over shadows; restrained radii; one soft shadow allowed on the
   floating detail panel)**, and **§4 (constraints)** are your load-bearing
   sections.
2. [`redesign-plan.md`](./redesign-plan.md) — your phase is **Phase 4**; skim
   Phase 5 so you don't do its work (operator-showcase `Controls/*` restyle, the
   aside heading, polish/motion pass, and the inspiration-folder teardown all
   belong to Phase 5 — **not** you).
3. Inspiration (look, don't copy): `examples/Elegant ape phylogenetic tree/Ape
Phylogeny.dc.html` — the right-side detail panel (`#faf6ec` surface, kicker →
   name → hairline rows → status dots → blurb, `apePanelIn` slide-in at
   `cubic-bezier(0.2,0.7,0.2,1)`). **Do not** depend on this folder; it's deleted
   in Phase 5.

Before starting: load the `frontend-ui-engineering` skill, and add
`browser-testing-with-devtools` for visual verification **if a Chrome DevTools
MCP is configured** (see "Verify" caveat below). Run the project skill check from
the repo root per the root `CLAUDE.md` if you touch tooling.

## What Phases 1–3 left you (use these — don't re-roll)

All tokens live in `src/styles/app.css`; consume via Tailwind utilities or
`var(--token)`. Type/palette foundation from Phase 1 is unchanged.

- **Type:** body/headings render EB Garamond (`font-sans`/`font-heading`);
  `font-mono` resolves to **Spline Sans Mono**. The established kicker idiom is
  `font-mono` + uppercase + `tracking-[0.14em]`–`tracking-[0.26em]` + `text-primary`
  (rust). Phase 3 uses `tracking-[0.26em]` on the title kicker and
  `tracking-[0.14em]` on the corner hint — match those for consistency.
- **Palette:** parchment `--background`, ink `--foreground`, rust `--primary`,
  `--card`/`--popover` panel surface, hairline `--border`, `--muted-foreground`.
  `::selection` is warm rose. Dark mode is re-tuned walnut+rust — keep it working.
- **Highlight tokens** (`--lineage`/`--subtree`/`--mrca`/`--search`/`--slice`/
  `--graft` + `-foreground`) are unchanged. Re-tuning their hues into one
  harmonious parchment scheme is **still open** if you want it for the per-operator
  accent chips in the panel — but keep the token **names**.
- **Conservation-status dots** (spec §3.2: `LC #6f7d57`, `NT #9c8a3f`, `VU #b0823c`,
  `EN #b06a37`, `CR #9a4528`): the inspiration uses these in panel rows. **Only
  wire them if `TaxonRow` actually carries a status field** — check the data
  (`src/server/taxonomy.functions.ts` / the Prisma model) before adding. If it
  doesn't, leave the existing extinct/extant treatment and don't invent data.

### Where Phase 3 put things (so your panel restyle doesn't collide)

- **The `<header>` bar is gone.** `routes/index.tsx` now mounts the canvas
  full-bleed in the `<section>` and floats chrome over it:
  - **Title overlay** top-left (`absolute left-5 top-5 sm:left-9 sm:top-7`,
    `z-10`): mono `prisma-ltree` kicker → serif `Tree of Life` (`font-heading`) →
    `h-px w-14 bg-border` rule → italic `font-heading` blurb. **The taxa count and
    the "every control maps to a real `ltree` query" line now live in that blurb**
    — don't duplicate them in the panel.
  - **Corner hint** top-right (`absolute right-5 top-6`, `z-10`, `sm:block`/hidden
    on mobile): mono uppercase pan/zoom/click.
  - The overlay wrapper is `pointer-events-none absolute inset-0 z-10`; only
    interactive bits opt back in with `pointer-events-auto`.
- **`SidePanel` is the file you own this phase.** It currently renders at
  `routes/index.tsx:155` and is positioned **inside** the same `<section>`,
  `absolute top-3 right-3 bottom-3 z-10` (`pointer-events-auto`, `w-[22rem]`,
  `bg-background/95 backdrop-blur`, `rounded-xl border shadow-xl`,
  `overflow-y-auto`). It shares `z-10` with the overlay but renders **after** it in
  DOM, so it stacks on top — the top-right corner hint sits behind the panel when
  open (acceptable; the panel surface covers it). If you change the panel's
  z-index or width, keep it ≥ the overlay so the hint never bleeds through, and
  keep it clear of the bottom-right `CanvasControls` (those are inside
  `TreeCanvas`, a `<Panel position="bottom-right">` — **don't** cover or restyle
  them; that's Phase 5-adjacent canvas chrome, leave it).
- **Wiring is unchanged:** `SidePanel` receives `taxon`, `lineage`, `subtree`,
  `allTaxa`, `onClose`, `onRecenter`. `onClose` is the page `reset` (clears
  highlight + selection); `onRecenter` calls `canvasRef.focusNode(path)`. The panel
  drives the operator stack — keep every operator control's behavior and the
  `ltree` query it fires exactly as-is.

## Your job (and only this)

Restyle `src/components/SidePanel.tsx` into the elegant detail card (spec §3.1 /
§3.3 / plan Phase 4). **No** `Controls/*` aside restyle (Phase 5), **no** canvas
or overlay changes (Phases 2–3 are done). Files:

### 1. `src/components/SidePanel.tsx`

- **Header:** mono uppercase rust **kicker** (e.g. `rank · parent`) → serif
  **display name** (`font-heading`, roman for common names) → italic serif
  **scientific name** sub (always italic) → hairline divider.
- **Rows:** mono **key** / serif **value** pairs from the existing
  `lineage`/`subtree` props (e.g. range, lineage depth, subtree size). Hairline row
  separators, not boxes. Wire conservation-status dots **only if** the data carries
  a status field (see note above).
- **Blurb** (if present in the data) → hairline → mono **breadcrumb** of the
  `ltree` path (the panel already reconstructs ancestor crumbs around
  `SidePanel.tsx:139` for recentering — restyle, don't rewire).
- **Surface:** keep it to the parchment `--card`/`--popover` palette; spec §3.3
  allows **one** soft low-opacity shadow here (the panel already has `shadow-xl` —
  consider softening toward the inspiration's `0 12px 40px rgba(60,44,28,0.18)`
  feel, but a single shadow only — remove any layered halos). Restrained radius
  (`3–5px`, i.e. `rounded`/`rounded-md`, not `rounded-2xl`).
- **Motion** (optional, plan lists it under Phase 4): an `apePanelIn`-style
  slide-in is fine to add here, but a full motion/polish sweep is Phase 5 — keep it
  light.
- Re-map the per-operator accent chips to the new palette.
- **Keep** the close + recenter affordances and the operator stack the panel
  currently drives — behavior unchanged.

## Constraints

- Every operator control keeps its exact behavior and the `ltree` query it fires.
- React Flow stays the engine; pan/zoom/fit/`focusNode`/highlight folding all
  preserved (you're not touching `TreeCanvas`/`TaxonNode` — only `SidePanel`).
- Client-only canvas mount + server skeleton stays (hydration-safe).
- Token **names** must not change. No new deps (no animation libs — CSS keyframes
  only). Don't invent data fields that aren't in `TaxonRow`.
- Don't touch `routes/index.tsx` chrome, `TreeCanvas`/`TaxonNode`, or `Controls/*`.

## Environment note (read this — it has cost prior phases time)

The server tests (`test/server/taxonomy.test.ts`) need a **running, seeded
Postgres**. If `vp test` shows `42P01` / connection errors, the DB is down or
empty. Bring it up before testing (this Mac uses **OrbStack** as the Docker
daemon):

```
open -a OrbStack            # Docker daemon
pnpm db:up                  # start postgres
pnpm emit && pnpm db:plan && pnpm db:init && pnpm seed   # if tables are missing
```

**Important:** `pnpm emit` / `pnpm db:init` regenerate `migrations/**` and
`src/prisma/contract.*`. Those are **out of scope** — if you run setup, `git
checkout --` those generated files before committing so your diff stays clean.
`vp test` prints a harmless `close timed out after 10000ms` teardown warning and a
stray `module is not defined` line after `Tests … passed` — both are pre-existing
noise; ignore them as long as the test count is green (**Phase 3 saw 44 passing**).

## Verify before you hand off

- [ ] `vp check` green (format + lint). Run `vp run typecheck` **separately** for
      tsc (note: `vp check` on this package runs format + lint only).
- [ ] `vp test` green (DB up + seeded; 44 passing as of Phase 3).
- [ ] Browser (`vp dev`): open the panel via a node click; all rows populate;
      close + recenter work; the operator stack fires the same `ltree` queries.
- [ ] Panel reads kicker → serif name → italic sci-name → hairline rows → blurb →
      mono breadcrumb; one soft shadow, restrained radius; sits clear of the
      bottom-right `CanvasControls` and doesn't let the corner hint bleed through.
- [ ] Light **and** dark mode both coherent.
- [ ] Responsive at 1440 / 1024 / 768 / 320; panel doesn't blanket the canvas on
      mobile (`max-w-[calc(100%-1.5rem)]` is already in place — keep it); focus
      visible; no a11y regressions (contrast ≥ 4.5:1 body).

> **Visual-verification caveat:** Phase 3 had **no Chrome DevTools MCP** available,
> so its browser pass was limited to booting `vp dev`, confirming the route serves
> 200 with CSS loaded and no compile/runtime errors in the dev log — it could not
> screenshot or drive the canvas/panel. (The route is client-hydrated, so the
> overlay/panel text is **not** in the raw SSR HTML — `curl` won't show it; that's
> expected, not a bug.) If your environment also lacks the MCP, say so in your
> handoff and do the same boot-and-serve check rather than claiming a visual pass
> you couldn't run.

## When done

1. Commit (branch `example/family-tree`): `style(family-tree): redesign Phase 4 —
side-panel detail card (kicker → name → hairline rows → breadcrumb)`.
2. Write `docs/redesign/phase-5-handoff.md` using **this file's structure**,
   pointing the next agent at Phase 5 (operator-showcase aside restyle + polish +
   **inspiration-folder teardown** + README). Note anything that affects Phase 5
   (final panel z-index/width, any new tokens or status-dot wiring, whether you
   added panel motion so Phase 5's polish pass doesn't double it up).
3. Leave the working tree clean.
