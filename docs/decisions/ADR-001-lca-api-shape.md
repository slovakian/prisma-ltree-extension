# ADR-001: `lca` API shape — variadic method on the first path

**Status:** Accepted
**Date:** 2026-06-19
**Phase/Task:** Phase 3, Task 3.2 (scalar functions)

## Context

PostgreSQL's `lca` (longest common ancestor) has two SQL forms:

- `lca(ltree, ltree, ...)` — up to 8 positional `ltree` arguments.
- `lca(ltree[])` — a single `ltree[]` argument.

Both return the longest label path that is an ancestor of all inputs (e.g.
`lca('1.2.3', '1.2.4', '1.2.5.6')` → `'1.2'`).

We must choose how this surfaces in the typed query API. The prisma-next
operation model is **`self`-centric**: every `QueryOperationTypeEntry` declares a
`self` codec and an `impl(self, ...args)`. Operations are bound to a column
(the `self`) at the client surface. Three candidate shapes:

1. **Variadic method on the first path** — `pathA.lca(pathB, pathC)` lowering to
   `lca({{self}}, {{arg0}}, {{arg1}})`. `self` = the first path; the rest are
   positional `ltree` args. `pathA.lca()` (no args) is valid and returns the
   path minus its last label.
2. **Namespace / free function** — `ltree.lca([pathA, pathB, pathC])` lowering to
   `lca(ARRAY[...]::ltree[])` or the array overload. No natural `self`.
3. **Array-receiver method** — `paths.lca()` where `paths` is an `ltree[]` column.

## Decision

**Adopt shape 1 — the variadic method on the first path.**

`impl: (self, other, ...rest) => buildOperation({ method: 'lca', args: [self, other,
...rest], returns: pg/ltree@1, template: 'lca({{self}}, {{arg0}}, ...)' })`, where
the template's placeholder count is generated from the actual argument count at
call time. Verified executable under PGlite: `lca(($1)::ltree, ($2)::ltree,
($3)::ltree)` → `'1.2'`.

**At least one `other` path is required.** PostgreSQL's positional `lca` has no
single-argument form (`lca(ltree)` raises `function lca(ltree) does not exist`);
the overloads cover 2–8 positional `ltree` args. The method signature therefore
makes the second path required (`(self, other, ...rest)`) so `path.lca()` is a
compile error rather than a runtime failure.

## Rationale

- **It is the only shape that fits the framework today without new SPI.** The
  operation model requires a `self` and supports variable arity (`impl:
(...args: never[])` in `QueryOperationTypeEntry`, and `buildOperation`'s `args`
  is `[AnyExpression, ...AnyExpression[]]`). The first path is a natural `self`.
- **Shape 2 (free function) is deferred.** A `self`-less namespace function is the
  same unresolved "free-function lowering" question flagged for Task 4.1
  (ADR-002, covering `text2ltree` / `text || ltree`). We do not want to invent
  that mechanism here; lca does not need it.
- **Shape 3 (array receiver) is gated by Tier 3.** `ltree[]`-typed receivers are
  the explicit unknown in Phase 5 (ADR-003). Tying lca to it would block a Tier 1
  function on a Tier 3 dependency.
- The variadic method reads naturally for the common case (compute the LCA of a
  column value and one or more other paths) and covers PG's positional form
  (up to 8 args) exactly.

## Consequences

- `docs/feature-support.md` is updated: `lca(ltree, ltree, ...)` →
  `path.lca(...others)` is the **supported** form (Tier 1). `lca(ltree[])` →
  `ltree.lca(paths)` is reclassified to **planned — revisit with the array
  receiver (ADR-003) or free-function support (ADR-002)**, no longer the primary.
- The template is built dynamically from arg count — the only op so far that does
  not use a static template string. Golden tests cover the 1-arg (`self` only),
  2-arg, and 3-arg renderings.
- PG caps positional `lca` at 8 args; we do not enforce that cap in types (a
  runtime PG error is acceptable and matches passing >8 to raw SQL). Revisit if a
  type-level cap is wanted.

## Alternatives rejected

- **Array form now** — would require either array-codec input plumbing or
  free-function lowering, both out of scope for Task 3.2.
- **Both forms now** — premature; the variadic form satisfies the Tier 1 need and
  the array form can be added non-breakingly once ADR-002/ADR-003 land.
