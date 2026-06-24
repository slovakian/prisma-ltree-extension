# Spec: Tree-of-Life interactive viewer (prisma-ltree showcase app)

**Location:** `examples/family-tree/` (reworked in place on branch `example/family-tree`).
**Spec author:** Phase-0 planning agent.
**Scope of this document:** defines _what_ the app is and how we'll know it's done.
Companion: `tree-of-life-app-plan.md` (phased, multi-agent execution plan).

---

## Objective

Replace the existing "British-royal-bloodline" demo with a **pannable, zoomable
phylogenetic tree viewer** rooted at **Catarrhini** (theMRCA of Old World monkeys
and apes) and detailed through Hominoidea down to living and key extinct _Homo_
species. The viewer's **purpose** is to _visually showcase every operator and
function the `prisma-ltree` extension exposes_ — each interactive control maps
to a real ltree query executed in PostgreSQL via prisma-next.

**Who it's for:** newcomers to `prisma-ltree` who want to _see_ what the extension
buys them, and reviewers of the extension pack who want a runnable, click-around
proof of the operator matrix. Secondary audience: curious humans who like pretty
trees.

**What success looks like:**

- A visitor runs `pnpm setup && pnpm dev`, opens `http://localhost:3000`, and
  sees a **horizontal left-to-right** tree of ~50 taxa (root on the left, tips
  on the right — the standard phylogenetic orientation), pan/zoom smooth, every
  node clickable and informatively rendered (image, name, rank, era, Wiki link).
- Every operator below is exercised by at least one visible control, and the UI
  surfaces the **operator name and SQL lowering** alongside each result so the
  extension's contribution is explicit rather than hidden behind "magic".
- The flat, indented-list UI from the prior app is gone. No node is rendered
  twice. Cross-branch MRCA demos land at _named_ clades (Hominini, Homininae,
  Hominidae, Catarrhini), driven by the same operators.

---

## Tech Stack

- **Runtime / framework:** TanStack Start (already scaffolded; preserved).
- **DB:** Postgres 17 (dockerized, ltree enabled; unchanged).
- **ORM / extension:** prisma-next + `prisma-ltree` from npm; same `extensions: [ltree]` wiring.
- **Tree rendering:** `@xyflow/react` (pan/zoom/edges/nodes); `d3-hierarchy`
  `tree()` layout for a **horizontal left-to-right** dendrogram (root on the
  left, tips on the right — the standard phylogenetic orientation, not the
  prior top-to-bottom plan). Coordinates are produced by `d3.tree().nodeSize([h, w])`
  and then x/y are _swapped_ before feeding React Flow so the layout engine stays
  tuned for dendrogram spacing while the canvas reads horizontally. SSR-safe.
- **Thumbnails:** Wikimedia, sourced at **seed time** via Wikipedia REST
  `pageimages` API and cached in the `taxon.thumbnail_url` column. Hot-linked
  from `upload.wikimedia.org` at render time.
- **Component layer:** **shadcn/ui** (radix-nova style, installed in
  `examples/family-tree/components.json`) — `Card`, `Button`, `Badge`,
  `Select`, `Input`, `Tabs`, `Dialog`, `Tooltip` etc. as the building blocks
  for `SidePanel` + the `Controls/*` panels. Import alias `~`, CSS file
  `src/styles/app.css`.
- **Theme:** a curated **warm + sophisticated** palette overriding shadcn's
  default neutrals — cream backgrounds, warm charcoal foregrounds, a
  terracotta `primary`, deep walnut-brown dark mode. Like a museum wall, not
  a SaaS dashboard. Theme tokens live in `src/styles/app.css` under `:root` /
  `.dark`. Showcase highlight states (`--lineage`, `--subtree`, `--mrca`,
  `--search`, `--slice`, `--graft`) are also declared there so canvas nodes
  can use `bg-lineage`, `bg-subtree`, `bg-mrca`, etc. without hand-rolled hex.
- **Label legibility:** every taxon node renders its label on a solid card
  background with a soft fade/halo at the edges (a gradient mask or a
  drop-shadow halo) so labels stay readable over crossing edges and the
  underlying canvas — no floating bare text over the tree.

---

## Project Structure (rework highlights)

```
examples/family-tree/
  prisma-next.config.ts        # unchanged
  docker-compose.yml           # unchanged
  prisma/
    contract.prisma           # NEW: `Taxon` model replaces `Person`
    db.ts                      # unchanged wiring
  src/
    prisma/contract.prisma     # NEW model + re-emitted artifacts
    seed-data.ts               # NEW: Catarrhini-rooted taxonomy
    server/
      runtime.ts               # unchanged
      taxonomy.ts              # NEW: full operator showcase matrix
    routes/
      index.tsx                # FULL REWRITE: React Flow viewer
      __root.tsx               # minor (page title / global styles)
    components/
      TreeCanvas.tsx           # NEW: React Flow wrapper
      TaxonNode.tsx            # NEW custom node (image + name + rank)
      SidePanel.tsx            # NEW selected-taxon panel
      Controls/                # per-feature control panels
        LineageControls.tsx
        SearchControls.tsx
        MrcaControls.tsx
        SliceControls.tsx
        GraftControls.tsx
        OperatorLegend.tsx
    lib/
      layout.ts                # path-list → d3-hierarchy → node/edge arrays
      nodes.ts                 # TaxonRow → React Flow Node type mapping
      highlight.ts             # selection / lineage / subtree palette
  scripts/
    seed.ts                    # extended: fetch thumbnails, then insert
    drop-db.ts                 # unchanged
  migrations/
    ltree/                     # re-emitted baseline
    app/                      # re-emitted for new Taxon model
```

---

## Code Style

Match existing app conventions (TanStack Start server functions via
`createServerFn`, prisma-next fluent builder, Prettier defaults, Tailwind utility
classes in JSX). One representative read-path server function:

```ts
// src/server/taxonomy.ts
export const getLineage = createServerFn({ method: "POST" })
  .validator((path: string) => path)
  .handler(async ({ data: path }): Promise<TaxonRow[]> => {
    await getRuntime();
    return db.orm.public.Taxon.where((t) => t.path.isAncestorOf(path)) // ltree `@>`
      .orderBy((t) => t.path.asc())
      .all();
  });
```

Custom React Flow node shapes are defined once in `components/TaxonNode.tsx`
and registered via `nodeTypes` on the Flow canvas (immuable mapping object,
declared outside the component, per React Flow guidance).

---

## Testing Strategy

- **Server functions**: each phase adds a fixture-driven test under
  `examples/family-tree/test/server/*.test.ts`. Pattern: spin the dockerized
  Postgres once (via `pnpm db:up`), seed, then assert row shapes for every
  operator function. Vitest is the runner (`vp test` is wired).
- **Layout**: pure unit test on `lib/layout.ts` — given a path list, returns
  correct node/edge arrays; deterministic.
- **e2e (deferred but planned)**: a single `test/e2e/showcase.e2e.test.ts`
  navigates the running app, exercises every operator control, asserts DOM
  evidence. Is deferred to the final polish phase; flagged as a Known
  Limitation if `@prisma-next/test-utils` (unpublished to npm) blocks it.
- **Build/lint**: `pnpm typecheck`, `pnpm build` (where DB-independent), and
  the workspace `vp check` must remain green after every phase.

---

## Boundaries

**Always:**

- Touch only `examples/family-tree/**` plus this spec/plan and the new docs.
- Re-emit contract artifacts after model changes (`pnpm emit`, `pnpm db:plan`).
- Keep `pnpm typecheck` and `pnpm test` green at every commit boundary.
- Surface the **operator name + SQL template** in the UI next to each result.
- Use real ltree queries — never compute lineage, subtree, MRCA, etc. in the client.
- Render every node label on a **solid card background with a soft edge
  fade/halo** — bare floating text over the canvas is never acceptable.
- Reuse **shadcn components** (`Card`, `Button`, `Badge`, `Select`, `Tabs`,
  `Tooltip`, `Dialog`, …) for all chrome (SidePanel, Controls, OperatorLegend);
  only the React Flow `TaxonNode` and the canvas edge styling hand-roll their
  own classes.

**Ask first:**

- Adding any runtime dependency beyond `@xyflow/react`, `d3-hierarchy`, and
  the shadcn registry (already-pinned in `examples/family-tree`).
- Changing the spec itself; update this doc first, then the plan, then the code.
- Adding network calls beyond the seed-time Wikipedia fetch.

**Never:**

- Commit `.env`, `node_modules`, `routeTree.gen.ts`, or DB credentials.
- Bump `@prisma-next/*` pins (extensão upgrade flow is out of scope here).
- Render the same taxon twice in the canvas (each `path` is one node).
- Compute LCA / lineage / subtree client-side — must round-trip Postgres.
- Hand-host images; only ever hot-link to `upload.wikimedia.org`.

---

## Operator Showcase Matrix

Every operator the extension exposes (see
`packages/extension-ltree/src/core/descriptor-meta.ts`) maps to a **per-node
fetch** or a **top-level control** in the viewer, so the operator name and SQL
lowering are surfaced next to every result rather than hidden behind magic.

### Per-node fetches (SidePanel)

Selecting a taxon fires a server function per operator family so the
SidePanel renders a stack of small panels, each labelled with the operator
name and SQL template, alongside the returned rows:

- **Ancestry panel** — `getLineage(path)` (`isAncestorOf`, `@>`) renders the
  path-to-root as clickable breadcrumbs.
- **Subtree panel** — `getSubtree(path)` (`isDescendantOf`, `<@`) shows
  descendant count + first generation of children.
- **Lineage slice panel** — `lineageSlice` (`subpath` / `subltree`) renders
  `subpath(self, off, len?)` crumbs to recenter the canvas at any
  intermediate clade.
- **Branch-point panel** — `indexOfBranch(a, b, off?)` (`indexOf`) shows the
  depth index where the selected path diverges from a pinned comparison path
  — explaining _why_ the MRCA lands where it does.
- **Generation badge** — `nlevel(path)` is rendered on every node card.

### Top-level controls (alongside the canvas)

- **MRCA finder** (`lca()` variadic) — two-taxa picker that returns the
  native `lca()` scalar _and_ resolves it to a `TaxonRow`; the MRCA node is
  highlighted with the `--mrca` token. Headline demos land on named clades
  (Hominini / Homininae / Hominidae / Hominoidea / Catarrhini /
  `Homo_heidelbergensis` extinct).
- **lquery pattern search** (`matchesLquery`, `~`) — pattern box
  (`*.Hominidae.*`, `Homo.*{2}`).
- **lquery-array tag picker** (`matchesLqueryArray`, `?`) — multi-pattern
  (`*.Pan.*` + `*.Homo.*`).
- **ltxtquery full-text search** (`matchesLtxtquery`, `@`) — `Homo & !sapiens`
  query (**new vs the original demo**).
- **Generation slider** (`nlevel()`) — "show only generation N" fades the
  rest of the canvas.
- **Lineage slice explorer** (`subpath` / `subltree`) — interactive crumbs
  around the currently-selected path (also surfaced per-node above).
- **Graft-a-taxon** (`concat`, `concatText`, `toText`, `toLtree`) — pick
  parent + label, server concatenates and inserts, canvas refetches;
  surfaces the lowering template before commit. (Tier-2 mutator demo.)
- **Two-subtree first-match** (Tier-3 `firstAncestorOf` `?@>`,
  `firstDescendantOf` `?<@`, `firstMatchLquery` `?~`,
  `firstMatchLtxtquery` `?@`) — pick clade _sets_ and find the first overlap.
  Optional per Open Questions; default to deferring if Phase 5 budget is tight.

### Matrix table

| Tier | Operator / function          | SQL template                 | UI surface                                                                |
| ---- | ---------------------------- | ---------------------------- | ------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| 1    | `isAncestorOf` (`@>`)        | `path @> $p`                 | Per-node Ancestry panel — clickable lineage crumbs to root.               |
| 1    | `isDescendantOf` (`<@`)      | `path <@ $p`                 | Per-node Subtree panel — descendant count + first children.               |
| 1    | `matchesLquery` (`~`)        | `path ~ $pq`                 | lquery pattern search box.                                                |
| 1    | `matchesLqueryArray` (`?`)   | `path ? $pqs`                | Multi-pattern lquery tag picker.                                          |
| 1    | `matchesLtxtquery` (`@`)     | `path @ $q`                  | ltxtquery full-text search.                                               |
| 1    | `nlevel()`                   | `nlevel(path)`               | Generation slider + depth badge on every node card.                       |
| 1    | `subltree()` / `subpath()`   | `subpath(self, $off, $len?)` | Per-node Lineage slice panel + recenter breadcrumbs.                      |
| 1    | `indexOf()`                  | `index(path, $other, $off?)` | Per-node Branch-point panel — depth index where two paths split.          |
| 1    | `lca()` (variadic)           | `lca($p1, $p2)`              | MRCA finder top-level control; scalar + resolved row side by side.        |
| 2    | `concat` (`                  |                              | `) / `concatText`                                                         | concat operator (see extension) | Graft-a-taxon form — pick parent + label; server concatenates, inserts. |
| 2    | `toText` / `toLtree`         | `ltree2text` / `text2ltree`  | Used internally by graft to coerce the label before concat.               |
| 3    | `firstAncestorOf` (`?@>`)    | `array_path ?@> $p`          | "Compare two subtrees" — pick two clades, see first overlapping ancestor. |
| 3    | `firstDescendantOf` (`?<@`)  | `array_path ?<@ $p`          | Same UI, descendant flavor.                                               |
| 3    | `firstMatchLquery` (`?~`)    | `array_path ?~ $pq`          | Multi-select: clade sets + pattern. First match highlighted.              |
| 3    | `firstMatchLtxtquery` (`?@`) | `array_path ?@ $q`           | Multi-select: clade sets + ltxtquery. First match highlighted.            |

The `OperatorLegend` component renders this matrix as a live legend that
updates which operators are "active" as you click around.

---

## Catarrhini-rooted dataset slice (authoritative topology)

Single root: `Catarrhini` (every query's "common ancestor at the chosen LCA").
Two main branches at the root: **Cercopithecoidea** (Old World monkeys) and
**Hominoidea** (apes); Hominoidea is detailed deeply, Cercopithecoidea is
included so cross-clade LCA queries settle _at the root_.

```
Catarrhini
├── Cercopithecoidea
│   └── Cercopithecidae
│       ├── Cercopithecinae          (macaques, baboons, mandrill, guenons)
│       │   ├── Macaca               (genus)
│       │   │   ├── Macaca_mulatta
│       │   │   └── Macaca_fuscata
│       │   ├── Papio
│       │   │   ├── Papio_anubis
│       │   │   └── Papio_hamadryas
│       │   └── Mandrillus
│       │       └── Mandrillus_sphinx
│       └── Colobinae                (colobus, langurs)
│           ├── Colobus
│           │   └── Colobus_guereza
│           └── Semnopithecus
│               └── Semnopithecus_entellus
└── Hominoidea
    ├── Hylobatidae                  (lesser apes — gibbons)
    │   ├── Hylobates
    │   │   └── Hylobates_lar
    │   └── Symphalangus
    │       └── Symphalangus_syndactylus
    └── Hominidae                    (great apes)
        ├── Ponginae
        │   └── Pongo
        │       ├── Pongo_pygmaeus
        │       ├── Pongo_abelii
        │       └── Pongo_tapanuliensis
        └── Homininae
            ├── Gorillini
            │   └── Gorilla
            │       ├── Gorilla_gorilla
            │       └── Gorilla_beringei
            └── Hominini
                ├── Pan
                │   ├── Pan_troglodytes
                │   └── Pan_paniscus
                └── Homo
                    ├── Homo_sapiens
                    ├── Homo_neanderthalensis     (extinct)
                    ├── Homo_heidelbergensis       (extinct; LCA-ish)
                    ├── Homo_ erectus             (extinct)
                    ├── Homo_floresiensis          (extinct)
                    ├── Homo_naledi                (extinct)
                    └── Homo_habilis               (extinct)
```

~50 nodes total. Each node carries: `scientific_name`, `common_name` (nullable),
`rank` (`parvorder` / `superfamily` / `family` / `subfamily` / `tribe` /
`genus` / `species`), `extinct` (bool), `ma_origin` / `ma_extinct` (nullable),
`wiki_url` (canonical Wikipedia article URL), `thumbnail_url` (resolved at
seed time via Wikipedia `pageimages` API; nullable if not available).

**Famous cross-branch MRCA demos the dataset makes possible** (each lands on a
_named_ clade, not an opaque path):

- `lca(Homo_sapiens, Pan_troglodytes)` → `Hominini`
- `lca(Homo_sapiens, Gorilla_gorilla)` → `Homininae`
- `lca(Homo_sapiens, Pongo_pygmaeus)` → `Hominidae`
- `lca(Homo_sapiens, Hylobates_lar)` → `Hominoidea`
- `lca(Homo_sapiens, Mandrillus_sphinx)` → `Catarrhini` (the root — the headline demo)
- `lca(Homo_sapiens, Homo_neanderthalensis)` → `Homo_heidelbergensis` (extinct LCA — visually striking)

---

## Success Criteria

1. `cd examples/family-tree && pnpm install && cp .env.example .env && pnpm setup && pnpm dev` boots; `http://localhost:3000` shows the pannable vertical tree, no console errors.
2. Every row of the Operator Showcase Matrix has at least one working UI control whose result is verifiable by clicking / typing; the rendered UI exposes the operator name and SQL template next to the result.
3. Clicking **Homo sapiens** paints its lineage back to `Catarrhini`; clicking `Hominidae` paints its subtree; both flow through real ltree predicates.
4. The MRCA picker can return `Catarrhini` for `(Homo_sapiens, Mandrillus_sphinx)` _and_ `Homo_heidelbergensis` for `(Homo_sapiens, Homo_neanderthalensis)`, with the MRCA node highlighted distinctively in the canvas.
5. lquery `*.Hominidae.*` returns every Hominidae descendant; ltxtquery `Homo & !sapiens` returns every non-sapiens _Homo_; matching nodes highlight in the canvas.
6. The **"graft a taxon"** form creates a new node by `concatText`-ing a label onto a chosen parent path, the new node lands correctly positioned in the canvas after refetch, and the new path round-trips to Postgres (visible via `\d+ taxon`).
7. No taxon node renders twice; no node is duplicated visually.
8. `pnpm typecheck` clean; `vp check` clean; server-function tests green; rebuild succeeds.
9. README rewritten for the new app; the two known gotchas (mandatory `db:plan`, ECR-mirror Docker pull) from the prior handoff are still documented (they remain real on this machine).
10. The deleted `docs/spec/family-tree-example-handoff.md` (removed in this phase) is not referenced anywhere live in the repo.

---

## Open Questions

- **Directory rename.** Should we rename `examples/family-tree` →
  `examples/tree-of-life` once stable, or keep the old name? Default:
  keep the path (lowest churn); revisit at the polish phase.
- **`suffix` operator (`?@>`, `?<@` strict forms)** — not in our extension;
  confirm we won't reference them in the UI.
- **Thumbnail fetch reliability** — if Wikipedia REST is rate-limited or
  inconsistent at seed time, decide between (a) retry/backoff, (b) just bake
  decoded page titles + resolved URLs lazily on first view via a server fn.
  Default: (a) with documented fallback to (b).
- **Should we also expose `getSubtree` via the array-receiver first-match
  operators**, or treat Tier-3 as "two-location MRCA" only? Default: latter
  — keeps the matrix readable.
