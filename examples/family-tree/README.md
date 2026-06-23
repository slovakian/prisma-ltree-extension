# prisma-ltree · Tree of Life

An interactive demo of PostgreSQL's [`ltree`](https://www.postgresql.org/docs/current/ltree.html)
hierarchical type, driven through [prisma-next](https://github.com/prisma/prisma-next)
and the [`prisma-ltree`](https://www.npmjs.com/package/prisma-ltree) extension.

It models a **Catarrhini-rooted phylogenetic tree** of Old World monkeys and
apes, detailed through Hominoidea down to living and key extinct _Homo_
species, and lets you explore lineages, subtrees, common ancestors (`lca`),
generations, `lquery` / `ltxtquery` searches, lineage slices, and graft-a-taxon
— every one of which executes in Postgres using a real `prisma-ltree` operator.

This example is **standalone**: it installs everything from npm and is not part
of the prisma-ltree monorepo build. Copy the folder anywhere and it still runs.

> **Phase status:** Phase 1 (data layer) implemented. The interactive React
> Flow viewer + operator control matrix land in Phases 2–6 (see
> `docs/spec/tree-of-life-app-plan.md`). The dev server boots to a placeholder
> landing page until Phase 3.

## Data layer: `Taxon` on `ltree`

The data is a single Catarrhini-rooted tree (one ltree path per taxon). 46
nodes total — living and key extinct _Homo_, plus Cercopithecidae so
cross-clade `lca` queries settle at the root `Catarrhini` rather than an
opaque path. Each row carries `scientific_name`, `common_name`, `rank`,
`extinct`, `ma_origin` / `ma_extinct` (era badges), `wiki_url`, and
`thumbnail_url` (resolved at seed time via the Wikipedia `pageimages` REST
API). Column names are snake_case (camelCase field names mapped via `@map`)
so the typed ORM API stays ergonomically camelCase (`t.scientificName`) while
raw `psql` reads `scientific_name`.

Curated cross-branch `lca()` demos this dataset makes possible:

- `lca(Homo_sapiens, Pan_troglodytes)` → `Hominini`
- `lca(Homo_sapiens, Gorilla_gorilla)` → `Homininae`
- `lca(Homo_sapiens, Pongo_pygmaeus)` → `Hominidae`
- `lca(Homo_sapiens, Hylobates_lar)` → `Hominoidea`
- `lca(Homo_sapiens, Mandrillus_sphinx)` → `Catarrhini` (the headline demo)
- `lca(Homo_sapiens, Homo_neanderthalensis)` → `Homo_heidelbergensis` (extinct LCA)

## Stack

| Piece    | Choice                                                  |
| -------- | ------------------------------------------------------- |
| Database | Postgres 17 (Docker) — `ltree` ships in the stock image |
| ORM      | prisma-next (`@prisma-next/postgres`) + `prisma-ltree`  |
| App      | TanStack Start (React 19, server functions, Vite)       |
| Runtime  | Node ≥ 24, pnpm                                         |

## Quickstart

```bash
pnpm install
cp .env.example .env

# One shot: start Postgres, emit the contract, apply migrations, seed.
pnpm setup

pnpm dev          # http://localhost:3000
```

`pnpm setup` is just these four steps:

```bash
pnpm db:up        # docker compose up (Postgres on :5434)
pnpm emit         # prisma-next contract emit  (contract.prisma → contract.json/.d.ts)
pnpm db:plan      # prisma-next migration plan (materializes the ltree + app migrations)
pnpm db:init      # apply migrations: CREATE EXTENSION ltree + create the person table
pnpm seed         # insert the dynasty
```

> `db:plan` is required before the first `db:init`: it copies the extension's
> baseline `CREATE EXTENSION ltree` migration out of the `prisma-ltree` package
> into `migrations/ltree/` and plans the `person` table. Without it, `db:init`
> fails with `PN-MIG-5001 declaredButUnmigrated`.

To start over: `pnpm db:drop && pnpm db:init && pnpm seed`. To tear down the DB
entirely: `pnpm db:down`.

## What each feature will map to

> The control surface overview below is the target (Operator Showcase
> Matrix from the spec). Phases 2–6 wire each one to a real UI control
> surfaced with the operator name + SQL template beside its result.

| In the UI                    | ltree operator                  | SQL                         |
| ---------------------------- | ------------------------------- | --------------------------- | --- | ------------------------- |
| Click a taxon → lineage      | `isAncestorOf` (`@>`)           | `path @> $p`                |
| Click a clade → subtree      | `isDescendantOf` (`<@`)         | `path <@ $p`                |
| lquery pattern search        | `matchesLquery` (`~`)           | `path ~ $pq`                |
| lquery array (multi-pattern) | `matchesLqueryArray` (`?`)      | `path ? $pqs`               |
| ltxtquery full-text          | `matchesLtxtquery` (`@`)        | `path @ $q`                 |
| Generation slider            | `nlevel()`                      | `nlevel(path) = $n`         |
| Lineage slice breadcrumbs    | `subltree()` / `subpath()`      | `subpath(self, $off, $len)` |
| Branch-point depth           | `indexOf()`                     | `index(path, $other, $off)` |
| MRCA (native scalar)         | `lca()` (variadic)              | `lca($a, $b)`               |
| Graft a taxon                | `concat` / `concatText` (`      |                             | `)  | `path \|\| $label::ltree` |
| Two-subtree first-match      | `firstAncestorOf` etc. (Tier 3) | `pa ?@> p` / `pa ?<@ p`     |

| In the UI                    | ltree operator          | SQL                               |
| ---------------------------- | ----------------------- | --------------------------------- |
| Click a person → ancestors   | `isAncestorOf` (`@>`)   | `path @> $p`                      |
| Click a person → descendants | `isDescendantOf`(`<@`)  | `path <@ $p`                      |
| Common ancestor (LCA)        | `isAncestorOf`+`nlevel` | deepest node above both `$a`,`$b` |
| Jump to a generation         | `nlevel`                | `nlevel(path) = $n`               |
| lquery pattern search        | `matchesLquery` (`~`)   | `path ~ $pattern::lquery`         |

> The LCA panel composes predicates (deepest common ancestor) so it can return a
> full row to highlight. The extension also ships a direct `lca()` scalar — see
> `prisma-ltree/operation-types`.

Some lquery patterns to try: `*.Hominidae.*`, `Homo.*{2}`, `*.Pan.*`.

## Layout

```
src/
  prisma/
    contract.prisma   # the schema: a Taxon model with an ltree `path`
    contract.json     # emitted contract (generated by `pnpm emit`)
    contract.d.ts     # emitted types     (generated by `pnpm emit`)
    db.ts             # the typed prisma-next client, wired with the ltree extension
  server/
    runtime.ts        # one pooled connection per server process
          # server functions: the ltree queries above (Phase 2)
  seed-data.ts        # the Catarrhini-rooted phylogeny (46 taxa)
  routes/index.tsx    # the interactive viewer (Phases 3-6)
scripts/
  seed.ts             # pnpm seed — inserts rows + resolves Wikipedia thumbnails
  drop-db.ts          # pnpm db:drop
prisma-next.config.ts # points emit/db:init at contract.prisma + the ltree extension
docker-compose.yml    # Postgres 17
```
