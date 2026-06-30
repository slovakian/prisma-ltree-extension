# ADR-005: GiST index support via the index-type registry

**Status:** Accepted
**Date:** 2026-06-30
**Phase/Task:** GiST index support (see `docs/spec/gist-index-support-plan.md`)

## Context

PostgreSQL's `ltree` query operators (`@>`, `<@`, `~`, `?`, `@`) are accelerated by a
**GiST index** using the `gist_ltree_ops` operator class (`gist__ltree_ops` for `ltree[]`).
Until now `prisma-ltree` shipped codecs, query operators, and PSL constructors but **no
index-type registration**, so consumers wanting a GiST index had to drop to raw SQL —
the exact thing the pack exists to avoid.

Prisma Next already renders non-btree indexes: the Postgres adapter emits
`CREATE INDEX … USING <method> (…) [WITH (…)]` from the validated contract IR
(`packages/3-targets/3-targets/postgres/src/core/migrations/operations/indexes.ts`).
Index **methods** are an extension SPI: a pack registers them with `defineIndexTypes()`
from `@prisma-next/sql-contract/index-types` and publishes the registration on its
descriptor under `indexTypes` (ADR 210). ParadeDB is the reference (`bm25`). Both
authoring lanes narrow and validate authored `type:` values against this registry; an
unregistered `type` fails authoring-time validation with `unregistered index type "…"`.

Two index-shape concerns are distinct:

- **Default GiST** — `USING gist`. Postgres picks `gist_ltree_ops` / `gist__ltree_ops`
  implicitly from the column type. Renderable by the existing adapter with no opclass work.
- **Operator-class tuning** — `gist_ltree_ops(siglen=N)`. `siglen` is an opclass typmod,
  **not** a `WITH (...)` storage parameter. Routing it through index `options` would emit
  invalid DDL. Per-column operator classes are an explicit ADR 210 non-goal.

## Decision

**Register a single `gist` index type with a closed, empty options shape, and wire it onto
both the pack descriptor (`/pack`) and the control descriptor (`/control`).**

```ts
// src/types/index-types.ts
export const ltreeIndexTypes = defineIndexTypes().add("gist", {
  options: type({ "+": "reject" }), // accepts {}, rejects any key
});
```

- `indexTypes: ltreeIndexTypes` on `ltreePackMetaBase` (flows to `/control` via spread).
- New `/index-types` entrypoint re-exporting the builder and its option types.
- Capability `postgres["ltree.gist"] = true` for contract-level feature detection.
- **Empty options.** Default GiST takes no storage parameters here, and keeping options
  closed avoids the `siglen` footgun and keeps the two authoring lanes producing identical
  index IR (empty `options: {}` is dropped during lowering).

Authors then write:

```ts
// TypeScript lane
constraints.index([cols.path], { name: "category_path_gist_idx", type: "gist", options: {} })
```

```prisma
// PSL lane
@@index([path], type: "gist", map: "category_path_gist_idx")
```

Both lower to `CREATE INDEX "…" ON "…" USING "gist" ("…")`.

## Authoring-lane reality (important)

| Lane              | Status            | Why                                                                                                                            |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **TypeScript**    | supported         | `defineContract({ extensionPacks: { ltree } })` carries the pack ref (with `indexTypes`) straight into the index-type registry. Verified end-to-end (emit → `type: "gist"` IR; PGlite create + query). |
| **PSL**           | blocked-upstream  | `@prisma-next/postgres`'s `defineConfig` builds the PSL provider via `prismaContract(path, { … })` **without** passing `composedExtensionPackRefs`. The PSL interpreter then builds the index-type registry from stub pack refs (no `indexTypes`), so an authored `type: "gist"` fails with `unregistered index type "gist"`. The CLI never injects these refs either. This is a framework gap, not an extension defect — the registration itself is correct and identical to ParadeDB's. |

The TS `options: {}` requirement is structural in the framework DSL: `IndexInput` makes
`options` required whenever `type` is set, with no `type`-without-`options` branch.

## Rationale

- **Uses the documented SPI, not a new mechanism.** Mirrors ParadeDB's `bm25` exactly;
  no Prisma Next change is required for the TS lane.
- **Correct DDL for both column types.** `USING gist` lets Postgres choose the default
  opclass; no per-column opclass support is needed.
- **No regression for any lane.** Contracts without GiST indexes are unaffected. A PSL
  author writing `type: "gist"` gets the same error with or without this registration —
  registering strictly enables the TS lane and is forward-compatible.

## Forward-compatibility with a future upstream `gist`

If Prisma Next later registers built-in index methods (e.g. on `@prisma-next/target-postgres`),
two registrations of the same `gist` literal raise a registration-time conflict (ADR 210).
Mitigation is a one-line removal of our `gist` entry in a future release; **the consumer
API and emitted SQL do not change.** Likewise, when upstream threads extension
`composedExtensionPackRefs` into the PSL provider (or `@prisma-next/postgres` exposes a way
to pass them), the PSL lane begins working with no extension change — the
`gist-authoring.test.ts` PSL guard flips from "rejects" to "emits GiST IR".

## Consequences

- `docs/feature-support.md`: new **Indexes** section; GiST `ltree` / `ltree[]` →
  `supported (TS lane)`; PSL lane → `blocked-upstream`; `siglen` stays out-of-scope;
  `fillfactor`/`buffering` tracked as `planned`.
- New package export `prisma-ltree/index-types`; build entry + `package.json#exports`
  updated; `docs/reference/export-map.md` updated.
- Tests: `test/index-types.test.ts` (registration + option validation + pack wiring),
  `test/integration/gist.integration.test.ts` (real `USING gist` on `ltree` and `ltree[]`
  in PGlite + operator correctness), `test/psl-lane/gist-authoring.test.ts` (TS-lane emit
  asserts GiST IR; PSL-lane emit pins the upstream limitation).
- Minor version bump `0.2.1` → `0.3.0`.

## Alternatives rejected

- **Map `siglen` through `options`.** Emits invalid `WITH (siglen=…)`; `siglen` is an
  opclass typmod. Out of scope until upstream per-column opclass support exists.
- **Ship a `prisma-ltree/config` wrapper** that re-implements `@prisma-next/postgres`'s
  `defineConfig` and threads `composedExtensionPackRefs` to unblock the PSL lane. Rejected
  for this release: it pulls several internal `@prisma-next/*` packages into the public
  dependency surface, couples the pack to upstream config internals, and changes the
  documented config import for **all** users. Tracked as a follow-up pending maintainer
  decision; the cleaner fix is upstream.
- **Do nothing / keep raw SQL.** Leaves the headline gap open for the (working) TS lane.
