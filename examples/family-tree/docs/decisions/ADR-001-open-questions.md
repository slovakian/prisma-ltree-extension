# ADR-001: Resolve Tree-of-Life spec Open Questions

**Status:** Accepted
**Date:** 2026-06-23
**Phase/Task:** Phase 7 — Polish, docs, verify-everything

## Context

`docs/spec/tree-of-life-app-spec.md` leaves four Open Questions open at
authoring time, each with a documented default. Phase 7 (the polish phase) is
the spec's designated checkpoint to either resolve or freshly ADR each one.
This ADR records the resolution for all four so the README and the showcase
matrix can speak definitively.

## Decisions

### 1. Directory rename — **keep `examples/family-tree`**

The spec floated renaming the directory to `examples/tree-of-life` once the
app stabilized. **Keep the existing path.** The directory name is internal
(referenced only by `pnpm-workspace.yaml`, the CI workflow, and this spec);
the user-facing title — "Tree of Life" — already lives in the app header,
`<title>`, and the README. Renaming now would churn workspace/CI/spec
references for no consumer-visible gain, mid-polish. The README leans on the
app title, not the folder name.

### 2. `suffix` / first-match operators — **not surfaced in the UI**

The extension ships the Tier-3 array-receiver first-match operators
(`firstAncestorOf` `?@>`, `firstDescendantOf` `?<@`, `firstMatchLquery` `?~`,
`firstMatchLtxtquery` `?@`) on the `pg/ltree-array@1` codec; they are covered
by the extension's own test suite. **The viewer does not surface them.** The
showcase matrix is already dense (hierarchy, pattern-match, depth/slice,
mutate); adding an array-receiver panel would dilute the pedagogical read
without exercising any extension primitive not already proven upstream. The
README documents the deferral so consumers know the operators exist and where.

### 3. Thumbnail fetch reliability — **seed-time retry with backoff (option a)**

Wikipedia's `pageimages` REST endpoint is hit once per taxon at seed time
(`scripts/seed.ts`), with retry + backoff and a `thumbnail_url = NULL`
fallback on failure (the `TaxonNode` renders a clade-glyph placeholder in
that case). **Keep this strategy; do not lazily resolve on first view.** The
seeded dataset is small (46 taxa) and stable, so a one-shot seed-time fetch
keeps the runtime path serverless-friendly (no per-view network call, no
client-side fetch state). The seed script already fails fast with a README
link on persistent network failure.

### 4. `getMrcaViaLca` return shape — **returns the full resolved clade row**

`lca()` lowers to a scalar `ltree` path, but the MRCA picker needs the full
`TaxonRow` (scientific + common name, rank, era, Wiki link) to render the
result card and highlight the node. **`getMrcaViaLca` resolves the scalar
`lca(a, b)` to its path, then fetches the matching row** so the picker can
return a complete row. This was already implemented this way in Phase 2; this
ADR records it as the decided shape, not an accident.

## Consequences

- No directory rename; workspace/CI untouched.
- The operator showcase matrix stays at its current width; Tier-3 operators
  are discoverable via the README pointer to the extension's operation types.
- Seed-time thumbnail resolution remains the contract; runtime stays
  fetch-free.
- The MRCA server function's row-returning signature is stable.
