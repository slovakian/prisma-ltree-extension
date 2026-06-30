# prisma-ltree — Feature Support Matrix

**Source of truth** for what `prisma-ltree` supports, does not support, and has in progress.
Doc-writing agents read this file to accurately reflect the extension's surface.

**Status values:** `supported` · `in-progress` · `planned` · `out-of-scope` (tracked, not built)
**Scope decision:** "Everything reasonable" — Tier 1 + Tier 2 + Tier 3 (first-match array ops)
**Last updated:** 2026-06-19

See `docs/spec/prisma-ltree-spec.md` for the full spec. See `docs/progress/` for per-tier logs.

---

## Codec & Contract

| Feature                                                                  | Status       | Notes                                                   |
| ------------------------------------------------------------------------ | ------------ | ------------------------------------------------------- |
| `pg/ltree@1` codec (string↔string, label validation)                     | supported    | Case 1, traits `['equality','order']`, constant factory |
| `pg/ltree-array@1` codec (`string[]`↔`string[]`, per-element validation) | supported    | Mirrors core `pg/text-array@1` pattern (ADR-003)        |
| `ltree()` column helper                                                  | supported    | Non-parameterized; `nativeType: 'ltree'`                |
| `ltreeArray()` column helper                                             | supported    | Non-parameterized; `nativeType: 'ltree[]'`              |
| `CREATE EXTENSION IF NOT EXISTS ltree` migration                         | supported    | invariantId `ltree:install-ltree-v1`                    |
| Contract storage type `ltree` (codec-instance)                           | supported    | TS contract source (not PSL)                            |
| Contract storage type `ltree[]` (codec-instance)                         | supported    | ADR-003                                                 |
| `lquery` as a column type                                                | out-of-scope | By decision — lquery is a validated string param        |
| `ltxtquery` as a column type                                             | out-of-scope | By decision — ltxtquery is a validated string param     |

## Hierarchy Operators (→ `pg/bool@1`)

| SQL              | API method                 | Status    | Tier |
| ---------------- | -------------------------- | --------- | ---- |
| `ltree @> ltree` | `path.isAncestorOf(rhs)`   | supported | 1    |
| `ltree <@ ltree` | `path.isDescendantOf(rhs)` | supported | 1    |

## Pattern-Matching Operators (→ `pg/bool@1`)

| SQL                 | API method                          | Arg      | Status    | Tier |
| ------------------- | ----------------------------------- | -------- | --------- | ---- |
| `ltree ~ lquery`    | `path.matchesLquery(pattern)`       | string   | supported | 1    |
| `ltree ? lquery[]`  | `path.matchesLqueryArray(patterns)` | string[] | supported | 1    |
| `ltree @ ltxtquery` | `path.matchesLtxtquery(query)`      | string   | supported | 1    |

## Scalar Functions

| SQL                           | API method                    | Returns      | Status                                                     | Tier |
| ----------------------------- | ----------------------------- | ------------ | ---------------------------------------------------------- | ---- |
| `nlevel(ltree)`               | `path.nlevel()`               | `pg/int4@1`  | supported                                                  | 1    |
| `subltree(ltree, start, end)` | `path.subltree(start, end)`   | `pg/ltree@1` | supported                                                  | 1    |
| `subpath(ltree, offset, len)` | `path.subpath(offset, len?)`  | `pg/ltree@1` | supported                                                  | 1    |
| `subpath(ltree, offset)`      | (overload of above)           | `pg/ltree@1` | supported                                                  | 1    |
| `index(a, b)`                 | `path.indexOf(other)`         | `pg/int4@1`  | supported                                                  | 1    |
| `index(a, b, offset)`         | `path.indexOf(other, offset)` | `pg/int4@1`  | supported                                                  | 1    |
| `lca(ltree, ltree, ...)`      | `path.lca(other, ...rest)`    | `pg/ltree@1` | supported (≥2 paths; ADR-001)                              | 1    |
| `lca(ltree[])`                | `paths.lca()`                 | `pg/ltree@1` | planned — array receiver exists (ADR-003); method deferred | 1    |

## Concatenation (→ `pg/ltree@1`)

| SQL                | API method                | Status    | Tier |
| ------------------ | ------------------------- | --------- | ---- |
| `ltree \|\| ltree` | `path.concat(rhs)`        | supported | 2    |
| `ltree \|\| text`  | `path.concatText(label)`  | supported | 2    |
| `text \|\| ltree`  | `path.prependText(label)` | supported | 2    |

`prependText` keeps the ltree column as the receiver even though it is the right
operand of `text || ltree` (ADR-002).

## Conversion

| SQL                 | API method             | Returns      | Status                                | Tier |
| ------------------- | ---------------------- | ------------ | ------------------------------------- | ---- |
| `ltree2text(ltree)` | `path.toText()`        | `pg/text@1`  | supported                             | 2    |
| `text2ltree(text)`  | `text.toLtree()`       | `pg/ltree@1` | supported (text-rooted; ADR-002)      | 2    |
| `text2ltree(text)`  | `Ltree.fromText(text)` | `pg/ltree@1` | planned — self-less constructor (SPI) | 2    |

`toLtree` is the reachable form of `text2ltree`: it is rooted on `pg/text@1` and
surfaces as a method on text columns (ADR-002). The self-less constructor spelling
`Ltree.fromText()` remains `planned` pending a free-function call surface.

## Array First-Match Operators (→ `pg/ltree@1`)

Receiver is `ltree[]` via `pg/ltree-array@1` (ADR-003).

| SQL                    | API method                         | Status    | Tier |
| ---------------------- | ---------------------------------- | --------- | ---- |
| `ltree[] ?@> ltree`    | `paths.firstAncestorOf(rhs)`       | supported | 3    |
| `ltree[] ?<@ ltree`    | `paths.firstDescendantOf(rhs)`     | supported | 3    |
| `ltree[] ?~ lquery`    | `paths.firstMatchLquery(pattern)`  | supported | 3    |
| `ltree[] ?@ ltxtquery` | `paths.firstMatchLtxtquery(query)` | supported | 3    |

## Indexes

The pack registers a `gist` index type (ADR-005) so authors can declare GiST
indexes on `ltree` / `ltree[]` columns through the standard index surface — no
raw SQL. PostgreSQL selects the default operator class (`gist_ltree_ops` for
`ltree`, `gist__ltree_ops` for `ltree[]`) from the column type, and the Postgres
adapter renders `CREATE INDEX … USING gist (…)`.

| Feature                                 | Authoring surface                                  | Status                  | Notes                                                                                          |
| --------------------------------------- | -------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| GiST index on `ltree` (default opclass) | TS `constraints.index([c], { type: "gist" })`      | supported (TS lane)     | ADR-005; `pg/ltree@1` column → `gist_ltree_ops`                                               |
| GiST index on `ltree[]` (default)       | TS `constraints.index([c], { type: "gist" })`      | supported (TS lane)     | ADR-005; `pg/ltree-array@1` column → `gist__ltree_ops`                                        |
| GiST index in the **PSL lane**          | `@@index([c], type: "gist")`                       | blocked-upstream        | Registration is correct; `@prisma-next/postgres` `defineConfig` does not yet thread extension `composedExtensionPackRefs` into the PSL provider (ADR-005). Use the TS lane until prisma-next forwards the refs. |

## Out-of-Scope (Tracked)

| Feature                                 | SQL                   | Status       | Reason / Revisit                                                                             |
| --------------------------------------- | --------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| Boolean array variant                   | `ltree[] @> ltree`    | out-of-scope | "Less useful" per scope; low marginal cost once array receiver exists — revisit after Tier 3 |
| Boolean array variant                   | `ltree[] <@ ltree`    | out-of-scope | same                                                                                         |
| Boolean array variant                   | `ltree[] ~ lquery`    | out-of-scope | same                                                                                         |
| Boolean array variant                   | `ltree[] ? lquery[]`  | out-of-scope | same                                                                                         |
| Boolean array variant                   | `ltree[] @ ltxtquery` | out-of-scope | same                                                                                         |
| GiST opclass tuning (`siglen=N`)        | DDL typmod            | out-of-scope | `siglen` is a `gist_ltree_ops` operator-class typmod, not a `WITH (...)` storage param; needs per-column opclass support upstream (ADR-005, ADR 210 non-goal) |
| GiST storage params (`fillfactor`, `buffering`) | `WITH (...)`  | planned      | Legitimate GiST `WITH` options; deferrable TS-only number/string-leaf `options` follow-up (ADR-005) |
| Hash index over `ltree`                 | DDL                   | out-of-scope | Not a recommended ltree index; same registration pattern if ever needed                      |
| B-tree index over `ltree`               | DDL                   | out-of-scope | Automatic for `<,<=,=,>=,>`; no extension op needed                                          |

---

## Changelog

- 2026-06-19 — Initial matrix created from spec. All in-scope features `planned`; out-of-scope features tracked with reasons.
- 2026-06-19 — Tier 1 complete (Checkpoint 2). Codec/contract/migration + all Tier 1 operators (hierarchy, pattern-match) and scalar functions (`nlevel`, `subltree`, `subpath`, `indexOf`, `lca`) → `supported`, each with golden + PGlite integration + type-level coverage. `lca` is a variadic method requiring ≥2 paths (ADR-001); the `ltree[]` array form remains `planned`.
- 2026-06-19 — Tier 2 complete (Checkpoint 3). Concatenation (`concat`, `concatText`, `prependText`) and conversion (`toText`, `toLtree`) → `supported`, each with golden + PGlite integration + type-level coverage. Free-function lowering resolved by re-rooting on a natural `self` (ADR-002): `text2ltree` ships as `text.toLtree()` (text-rooted); the self-less `Ltree.fromText()` constructor stays `planned` pending a free-function call surface.
- 2026-06-19 — Tier 3 complete (Checkpoint 4). Array receiver resolved via dedicated `pg/ltree-array@1` codec + `ltreeArray()` column helper (ADR-003). All four first-match operators → `supported` with golden + PGlite integration + type-level coverage. `lca(ltree[])` remains `planned` as `paths.lca()` — mechanism unblocked, method not in Tier 3 scope.
- 2026-06-19 — Phase 6 polish. Coverage threshold set to 95% in `vite.config.ts`; gaps filled to **100%** statements/branches/functions/lines (116 tests). Package `README.md` and per-tier `docs/progress/` logs written. Matrix verified accurate against shipped surface (no status changes). Pending: npm publish over the `0.0.1` stub (Task 6.3, awaiting approval).
- 2026-06-30 — GiST index support (ADR-005). Pack registers a `gist` index type via `defineIndexTypes`; authors declare GiST indexes through `constraints.index([c], { type: "gist" })` (TS) / `@@index([c], type: "gist")` (PSL). **TS lane → supported** end-to-end (emit + PGlite). **PSL lane → blocked-upstream**: `@prisma-next/postgres` `defineConfig` does not forward extension `composedExtensionPackRefs` to the PSL interpreter, so the index-type registry is built without the extension's `indexTypes`. Custom `siglen` opclass tuning stays out-of-scope; `fillfactor`/`buffering` `WITH` options are a planned TS-only follow-up.
