# Implementation Plan: GiST Index Support for `prisma-ltree`

**Status:** In progress
**Date:** 2026-06-30
**Branch:** `cursor/add-gist-index-support-00ce`
**Target release:** minor version bump (`0.2.1` → `0.3.0`)

## Objective

Let `prisma-ltree` consumers declare **GiST indexes** on `ltree` / `ltree[]` columns
through the standard Prisma Next index surface — `constraints.index(...)` in the TS lane
and `@@index(..., type: "gist")` in the PSL lane — **without dropping to raw SQL**.

This closes the gap recorded in `docs/feature-support.md` (GiST currently
`out-of-scope`) and in the adoption skill ("GiST / specialized ltree indexes via the
extension — index DDL is owned by Prisma Next's index story").

## Feasibility summary (settled)

- **Prisma Next already renders non-btree indexes.** The Postgres adapter emits
  `CREATE INDEX … USING <method> (…) [WITH (…)]` from the validated contract IR
  (`packages/3-targets/3-targets/postgres/src/core/migrations/operations/indexes.ts`).
- **Index methods are an extension SPI.** Packs register index types via
  `defineIndexTypes()` from `@prisma-next/sql-contract/index-types` and publish them on
  the pack descriptor under `indexTypes` (ADR 210). ParadeDB is the reference
  (`bm25`). Both authoring lanes (TS + PSL) narrow and validate against the registry.
- **What is missing is only the registration.** `prisma-ltree`'s pack descriptor ships
  codecs, query ops, and PSL constructors but **no `indexTypes`**, so any contract using
  `type: "gist"` fails authoring-time validation with `unregistered index type "gist"`.
- **Custom `gist_ltree_ops(siglen=N)` is out of scope.** `siglen` is an operator-class
  typmod, not a `WITH (...)` storage parameter; mapping it through `options` would emit
  wrong DDL. Per-column operator classes are an explicit ADR 210 non-goal and would need
  framework work. We register **default GiST only** (Postgres picks `gist_ltree_ops` /
  `gist__ltree_ops` implicitly from the column type).

## Design decisions

1. **Register the literal `gist`.** Emits `CREATE INDEX … USING gist (...)`, which is the
   correct DDL for both `ltree` and `ltree[]` columns (PG selects the default opclass).
2. **No `options` in v1.** Validator is `type({ "+": "reject" })` — accepts an empty
   options object, rejects any keys. This keeps PSL and TS byte-identical and avoids the
   `siglen` footgun. (`fillfactor` / `buffering` are legitimate GiST `WITH` params and may
   be added later as a TS-only, number/string-leaf options shape; deferred.)
3. **Mirror ParadeDB's layout** for discoverability and upgrade-safety:
   - `src/types/index-types.ts` — `ltreeIndexTypes` builder + exported option type.
   - `src/exports/index-types.ts` — public `/index-types` entrypoint.
   - `indexTypes: ltreeIndexTypes` on `ltreePackMeta`.
   - capability `"ltree.gist": true` for contract-level feature detection.
4. **Upgrade-safety vs. future upstream `gist`.** If Prisma Next later registers built-in
   methods (gin/gist/…) on `@prisma-next/target-postgres`, two packs registering the same
   `type` literal throw a registration-time conflict (ADR 210). Mitigation is a one-line
   removal of our `gist` entry in a future release; **the consumer API and emitted SQL do
   not change**. Documented in the ADR's "Consequences / forward-compatibility".

## Implementation findings (post-build)

Verified against prisma-next `0.14.0` under Node 24:

- **TS lane works end-to-end.** `defineContract({ extensionPacks: { ltree } })` threads the
  pack ref (with `indexTypes`) into the index-type registry; emit produces `type: "gist"`
  index IR and the adapter renders `CREATE INDEX … USING gist`.
- **PSL lane is blocked upstream.** `@prisma-next/postgres`'s `defineConfig` builds the PSL
  provider via `prismaContract(path, { … })` **without** `composedExtensionPackRefs`, and
  the CLI never injects them, so the PSL index-type registry is built from stub pack refs
  with no `indexTypes`. An authored `@@index(type: "gist")` fails with
  `unregistered index type "gist"`. The extension's registration is correct and identical
  to ParadeDB's; this is a framework gap. See ADR-005.
- **Empty options drop out of the IR**, so the two lanes would be byte-identical once the
  PSL channel is fixed.

Net: ship TS-lane GiST support now (real, correct, forward-compatible); document the PSL
limitation precisely with the exact upstream fix; pin it with a guard test.

## Phases

### Phase 1 — Core registration (source)
- Add `src/core/constants.ts` entry `GIST_INDEX_TYPE = "gist"` (or co-locate in
  `index-types.ts`).
- Create `src/types/index-types.ts`:
  ```ts
  export const ltreeIndexTypes = defineIndexTypes().add("gist", {
    options: type({ "+": "reject" }),
  });
  export type LtreeIndexTypes = typeof ltreeIndexTypes.IndexTypes;
  export type GistIndexOptions = LtreeIndexTypes["gist"]["options"];
  ```
- Create `src/exports/index-types.ts` re-exporting the builder + types.
- Wire `indexTypes: ltreeIndexTypes` and `capabilities.postgres["ltree.gist"] = true`
  into `ltreePackMetaBase` (`src/core/descriptor-meta.ts`).
- Add `src/exports/index-types.ts` to `vite.config.ts` `pack.entry` and add
  `"./index-types"` to `package.json#exports`.

**Acceptance:** package builds; `prisma-ltree/index-types` resolves; pack meta exposes
`indexTypes` with one `gist` entry.

### Phase 2 — Tests
- **Unit** (`test/index-types.test.ts`): one `gist` entry; option validator accepts `{}`,
  rejects unknown keys; pack meta declares `ltree.gist` capability and wires `indexTypes`.
- **TS-lane authoring** (`test/index-types.authoring.test.ts` or extend pack-authoring):
  build a `defineContract` with `constraints.index([cols.path], { type: "gist" })` on an
  `ltree()` column and an `ltreeArray()` column; assert the lowered IR carries
  `type: "gist"`. Negative: an unregistered type rejects.
- **PSL ↔ TS parity** (extend `test/psl-lane/`): add a `@@index([path], type: "gist", …)`
  to `contract.prisma` and the matching `constraints.index` to `contract.ts`; the existing
  byte-for-byte parity test proves both lanes lower identically and pass index-type
  validation. Add a focused assertion that the emitted IR index has `type: "gist"`.
- **PGlite integration** (`test/integration/gist.integration.test.ts`): create a real
  `CREATE INDEX … USING gist` on `ltree` and `ltree[]` columns in PGlite (ltree contrib),
  confirm creation succeeds and `isDescendantOf` / `matchesLquery` still return correct
  results with the index present.

**Acceptance:** `vp test` green, coverage ≥ 95% retained.

### Phase 3 — Docs & decision record
- `docs/decisions/ADR-005-gist-index-support.md` — context, decision (default GiST only,
  no options, forward-compat with upstream).
- `docs/feature-support.md` — move GiST `ltree` / `ltree[]` rows from `out-of-scope` →
  `supported`; add a "GiST index" section; changelog entry. Keep `siglen` tracked as
  out-of-scope with the opclass reason.
- `skills/prisma-ltree-adoption` + `skills/prisma-ltree-queries` + `skills/prisma-ltree`:
  replace "GiST not supported / use raw SQL" notes with the supported surface.
- Package `README.md`: add a GiST index usage snippet (both lanes).

### Phase 4 — Website
- `apps/web/content/docs/authoring.mdx`: add an "Indexing with GiST" section with PSL +
  TS `Tabs`.
- `apps/web/content/docs/index.mdx`: mention GiST indexes in the feature list.
- Optionally cross-link from operations pages (hierarchy / pattern-matching) noting GiST
  accelerates these operators.

### Phase 5 — Release prep
- Minor bump `package.json` `0.2.1` → `0.3.0`.
- Add changeset / changelog note if the repo uses changesets.
- `vp check` + `vp test` + `vp run ready` (incl. `check-pins`) green.

### Phase 6 — Ship
- Commit logically (core, tests, docs, website, version), push branch, open PR to `main`.
- Publishing to npm is a release-pipeline step requiring registry credentials; flag for
  the maintainer (do not publish from the agent without explicit credentials/approval).

## Out of scope (tracked)

- `gist_ltree_ops(siglen=N)` and other per-column operator-class tuning — needs Prisma
  Next per-column opclass support (ADR 210 non-goal today).
- Partial GiST indexes (`WHERE` predicate) — no Postgres partial-index surface in the SQL
  family contract IR yet.
- `gin` / `hash` / `brin` over ltree — not the recommended ltree index; can follow the
  same registration pattern if a need arises.

## Environment note

The package declares `engines.node >= 24`. The TS-lane contract provider (used by the
parity test) **requires Node ≥ 24**; under Node 22 `contract emit` of a `.ts` contract
fails with "Failed to resolve contract source". Validate with Node 24.
