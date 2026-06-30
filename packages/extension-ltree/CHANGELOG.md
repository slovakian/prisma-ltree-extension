# prisma-ltree

## 0.3.0

### Minor Changes

- Add GiST index support. The pack now registers a `gist` index type via `defineIndexTypes`, so authors can declare GiST indexes on `ltree` / `ltree[]` columns directly in the contract — `constraints.index([cols.path], { type: "gist", options: {} })` — which lowers to `CREATE INDEX … USING gist (…)` with no raw SQL. Adds a new `prisma-ltree/index-types` export and an `ltree.gist` capability.

  GiST authoring is fully supported in the TypeScript lane. The PSL lane (`@@index([path], type: "gist")`) is currently blocked by an upstream `@prisma-next/postgres` gap: its `defineConfig` does not forward extension index-type registrations to the PSL interpreter, so emit rejects the authored `gist` type. See ADR-005 for the precise root cause and forward-compatibility notes. Custom `gist_ltree_ops(siglen=N)` opclass tuning remains out of scope.

## 0.2.1

### Patch Changes

- Remove consumer-facing @db.Ltree documentation and set npm homepage to prisma-ltree.procka.org.

## 0.2.0

### Minor Changes

- c92389f: Add PSL contract-lane support: author `ltree.Ltree()` and `ltree.LtreeArray()` in `contract.prisma`, with byte-identical TS↔PSL parity tests and consumer documentation.

## 0.1.1

### Patch Changes

- 482febe: Focus the published README on consumer adoption: remove PGlite/Vite+ development notes, internal architecture detail, and broken monorepo doc links.
