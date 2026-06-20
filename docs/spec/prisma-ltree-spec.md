# Spec: prisma-ltree — Prisma Next Extension for PostgreSQL `ltree`

**Status:** Draft (awaiting review)
**Date:** 2026-06-19
**Scope decision:** "Everything reasonable" (Tier 1 + Tier 2 + Tier 3 first-match array ops)
**Author:** Agent (spec-driven-development)

---

## 1. Objective

Build **`prisma-ltree`** — a Prisma Next extension pack that brings PostgreSQL's `ltree`
hierarchical-tree data type into Prisma's contract-first query builder, so application authors
can define `ltree` columns and use ltree's hierarchy, pattern-match, scalar, concatenation, and
first-match-array operators as prisma-native, type-safe query methods.

### Who is the user

Application developers using Prisma Next (`@prisma-next/*@0.14.0`) who model hierarchical data
(category trees, org charts, taxonomies, file-system-like paths) in PostgreSQL and want first-class,
type-safe query operators for ancestor/descendant checks, lquery/ltxtquery pattern matching, path
manipulation, and common-ancestor computation — without dropping to raw SQL.

### What success looks like

- A developer can declare `path: field.column(ltree())`, register `extensionPacks: { ltree: ltreePack }`,
  and write `tables.t.columns.path.isDescendantOf(param("prefix"))` with full type inference.
- Every in-scope operator lowers to the correct SQL template and round-trips through PGlite.
- Every ltree feature — supported, not supported, or in progress — is listed in
  `docs/feature-support.md` so doc-writing agents can accurately reflect the extension's surface.
- The package builds, typechecks, lints, and tests clean under Vite+ (`vp run ready`).

### Why now

The npm name `prisma-ltree` is claimed (`prisma-ltree@0.0.1` stub live). The framework packages
are published at `0.14.0`. The prisma-next reference implementations (pgvector, postgis) are synced
locally in `.sync/prisma-next/`. All prerequisites are in place to build the real extension.

---

## 2. Tech Stack

| Concern               | Choice                                                                          |
| --------------------- | ------------------------------------------------------------------------------- |
| Framework             | Prisma Next — `@prisma-next/*@0.14.0` (exact-pinned, from npm)                  |
| Family / Target       | `sql` / `postgres`                                                              |
| Language              | TypeScript (strict, `noImplicitOverride`, no `any`, no bare `as` in production) |
| Validation            | `arktype` (per framework convention — not zod)                                  |
| Build                 | `tsdown` via Vite+ (`vp pack` / `vp run build`)                                 |
| Test                  | `vitest` via Vite+ (`vp test`), imports from `vite-plus/test`                   |
| Lint/Format/Typecheck | Oxlint + Oxfmt + tsc via Vite+ (`vp check`, `vp check --fix`)                   |
| Integration runtime   | PGlite (supports `ltree` — it is a trusted extension)                           |
| Package manager       | pnpm (via `vp install`)                                                         |
| Node                  | `>=24` (matches framework; see Open Questions)                                  |

> **Bin-shim distinction (ADR 211):** `prisma-next` (unscoped npm name) is a bin-only CLI shim —
> `import 'prisma-next'` is a hard resolution failure. Extensions import the **scoped**
> `@prisma-next/*` SPI packages (e.g. `@prisma-next/cli`, `@prisma-next/family-sql`) from npm, never
> `prisma-next`. The `@prisma-next/cli` devDep provides the `prisma-next` bin for `contract emit` /
> `migration plan` via `pnpm exec prisma-next ...`.
>
> **3 internal-only `@prisma-next/*` packages are NOT published to npm** (`@prisma-next/tsconfig`,
> `@prisma-next/tsdown`, `@prisma-next/test-utils` — 404 on `npm view`). They exist only inside the
> prisma-next monorepo. Mitigations: (1) inline the `@prisma-next/tsconfig/base` settings directly
> into our `tsconfig.json` (no `extends`); (2) use the Vite+ `pack` block in `vite.config.ts` instead
> of `@prisma-next/tsdown`/`tsdown.config.ts`; (3) use the Vite+ `test` block instead of
> `@prisma-next/test-utils`/`vitest.config.ts` (inline the `timeouts.default` constant if needed).
>
> **`@prisma-next/extension-author-tools`** (published, `0.14.0`) is a devDep; its
> `prisma-next-check-pins` bin enforces the exact-pin rule across `dependencies`,
> `peerDependencies`, and `optionalDependencies`.

---

## 3. Commands

All commands run from the repo root unless noted. Tooling is **Vite+** (`vp`), not the prisma-next
pnpm/biome scripts. The extension package additionally exposes `prisma-next` CLI commands for
contract/migration emit (run via the framework CLI, not `vp`).

```bash
# Setup
vp install                       # install deps (run after pulling)

# Validation (run before considering work done)
vp check                         # format + lint + typecheck
vp check --fix                   # auto-fix format + lint
vp test                          # run tests (vitest) for current package
vp run -r test                   # run tests recursively across workspace
vp run build                     # build packages (tsdown)
vp run ready                     # check + test + build (full validation)

# Extension-specific (run inside packages/extension-ltree/ via the framework CLI)
prisma-next contract emit        # emit src/contract.{json,d.ts}
prisma-next migration plan       # plan migrations into migrations/<dir>/
node migrations/<dir>/migration.ts  # re-emit ops.json + migration.json deterministically

# Diagnostics
vp env doctor                    # diagnose setup/runtime/package-manager issues
```

> **Note on the `prisma-next` CLI:** the pgvector reference invokes `prisma-next contract emit` and
> `prisma-next migration plan`. In our standalone repo these are provided by the `@prisma-next/cli`
> dev dependency (at `0.14.0`), invoked through `pnpm exec prisma-next ...` or the package's own
> `build:contract-space` script. The exact invocation will be confirmed during scaffolding
> (source-driven-development against `.sync/prisma-next/`).

---

## 4. Project Structure

### 4.1 Repository layout

```
prisma-ltree/
  packages/
    extension-ltree/        # THE extension pack (prisma-ltree)
    utils/                  # Vite+ starter scaffold (reference only — do not modify)
  apps/
    website/                # Documentation website (Vite+)
  docs/
    spec/                   # Specs (this file lives here)
    decisions/              # ADRs (architecture decision records)
    progress/               # Progress tracking, feature status logs
    feature-support.md      # Feature support matrix (source of truth for doc agents)
    prisma-next/            # prisma-next extension architecture reference docs
    ltree/                  # PostgreSQL ltree reference docs
  .sync/prisma-next/        # Synced prisma-next source (gitignored — never commit)
  scripts/sync.sh           # sync-docs script
  vite.config.ts            # Vite+ config (oxlint prefer-vite-plus-imports: error)
```

### 4.2 Extension package layout (`packages/extension-ltree/`)

Mirrors the pgvector reference (`.sync/prisma-next/packages/3-extensions/pgvector/`), adapted to our
flat `packages/extension-ltree/` location (no `3-extensions/` domain tier — single-extension repo).

```
packages/extension-ltree/
  package.json              # name: "prisma-ltree", prismaNext metadata, exports map
  prisma-next.config.ts     # defineConfig({ family: sql, target: postgres, ... })
  tsconfig.json             # inlined @prisma-next/tsconfig/base settings (package is unpublished)
  vite.config.ts            # Vite+ pack + test + lint + fmt config (replaces tsdown.config.ts / vitest.config.ts)
  src/
    contract.ts             # TS contract source (defineContract) — ltree codec-instance type
    contract.json           # EMITTED by prisma-next contract emit
    contract.d.ts           # EMITTED by prisma-next contract emit
    core/
      constants.ts          # LTREE_CODEC_ID = 'pg/ltree@1', label/path limits
      contract-space-constants.ts  # LTREE_SPACE_ID, native type, invariantIds
      codecs.ts             # LtreeCodec + LtreeDescriptor + ltree column helper
      registry.ts           # buildCodecDescriptorRegistry(codecDescriptors)
      authoring.ts          # AuthoringTypeNamespace (ltree.Ltree type constructor)
      descriptor-meta.ts    # ltreeQueryOperations() + ltreePackMeta
    types/
      codec-types.ts        # Ltree branded type, CodecTypes
      operation-types.ts    # QueryOperationTypes signature
    exports/
      control.ts            # SqlControlExtensionDescriptor (contract space + codec hooks)
      runtime.ts            # SqlRuntimeExtensionDescriptor (codec registry + ops)
      codec-types.ts        # re-export from types/
      operation-types.ts    # re-export from types/
      column-types.ts       # ltree() column type descriptor factory
      pack.ts               # re-export ltreePackMeta as default
  migrations/
    refs/head.json          # head hash + invariants
    <timestamp>_install_ltree/
      migration.json        # from/to hash, providedInvariants, migrationHash
      ops.json              # the CREATE EXTENSION op (precheck/execute/postcheck)
      migration.ts          # Migration subclass + MigrationCLI.run (hand-authored, Path B)
      end-contract.json     # emitted end-contract snapshot
      end-contract.d.ts     # emitted end-contract types
  test/
    codecs.test.ts          # encode/decode round-trip + label validation
    operations.test.ts      # query operator lowering golden tests (template verification)
    column-types.test.ts    # column type descriptor validation
    pack-authoring.test.ts  # authoring type namespace validation
    descriptor.test.ts      # pack metadata, registry, codec descriptor presence
    (integration/)          # PGlite end-to-end tests (create ext, table, insert, query)
```

### 4.3 Package exports (`package.json` `exports`)

Per the naming-and-layout convention, adapted to the unscoped `prisma-ltree` name. Output is flat
`dist/<name>.mjs` (tsdown flattens the `src/exports/` subdir; `.mjs` extension), mirroring the
pgvector reference. The `exports: true` option in the `pack` block of `vite.config.ts` keeps this
map in sync with actual build output.

```json
{
  "exports": {
    "./codec-types": "./dist/codec-types.mjs",
    "./column-types": "./dist/column-types.mjs",
    "./control": "./dist/control.mjs",
    "./operation-types": "./dist/operation-types.mjs",
    "./pack": "./dist/pack.mjs",
    "./runtime": "./dist/runtime.mjs",
    "./package.json": "./package.json"
  }
}
```

Self-referential import paths inside `descriptor-meta.ts` use `prisma-ltree/codec-types`,
`prisma-ltree/operation-types`, etc. (per the locked name decision).

### 4.4 Required `package.json` metadata

```json
{
  "name": "prisma-ltree",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": false,
  "prismaNext": {
    "family": "sql",
    "dialects": ["postgres"],
    "type": "extension-pack"
  },
  "engines": { "node": ">=24" }
}
```

### 4.5 Dependency strategy (exact-pinned from npm)

All `@prisma-next/*` packages are exact-pinned at `0.14.0` (no `^`/`~`, no `workspace:` — this is a
standalone repo). `prisma-next-check-pins` (from the `@prisma-next/extension-author-tools` devDep)
enforces this across `dependencies`, `peerDependencies`, and `optionalDependencies`.

**`dependencies`** (10 published runtime SPI packages, mirroring pgvector):
`@prisma-next/{contract, contract-authoring, family-sql, framework-components, migration-tools,
sql-contract, sql-operations, sql-relational-core, sql-runtime, sql-schema-ir}` all at `0.14.0`,
plus `@standard-schema/spec` and `arktype`.

**`devDependencies`** (published, `0.14.0`):
`@prisma-next/{adapter-postgres, cli, operations, postgres, sql-contract-ts, target-postgres,
extension-author-tools}`. The three internal-only packages (`tsconfig`, `tsdown`, `test-utils`) are
NOT installable — see §2 mitigations. Tooling (`typescript`, `@types/node`, `vite-plus`) comes via
the Vite+ catalog (`catalog:`); `@typescript/native-preview` is pinned for `dts: { tsgo: true }`.

**`peerDependencies`** (optional): `@prisma-next/adapter-postgres` at `0.14.0`, `typescript` at
`>=5.9`.

---

## 5. Scope — Feature Support Matrix

This is the **source of truth** for what the extension does, does not, and will support. It is
maintained as `docs/feature-support.md` and updated as work progresses. Doc-writing agents read this
matrix to reflect support accurately. Status values: `supported` · `in-progress` · `planned` ·
`out-of-scope` (tracked).

> **Correction note:** `docs/ltree/postgresql-ltree-reference.md` (§ "Hypothetical prisma-next API
> Mapping") and `AGENTS.md` map `?` to `matchesLtxtquery`. That is incorrect. Per the ltree operator
> table: `~` is `ltree ~ lquery`, `?` is `ltree ? lquery[]`, `@` is `ltree @ ltxtquery`. This spec
> uses the corrected mapping. The reference docs should be amended.

### 5.1 In-Scope

#### Tier 1 — Core (MVP)

**Codec & contract**

| Feature                                              | Status  | Notes                                                    |
| ---------------------------------------------------- | ------- | -------------------------------------------------------- |
| `pg/ltree@1` codec (string↔string, label validation) | planned | Case 1, traits `['equality','order']`, constant factory  |
| `ltree()` column helper                              | planned | Non-parameterized; `nativeType: 'ltree'`                 |
| `CREATE EXTENSION IF NOT EXISTS ltree` migration     | planned | Baseline migration, invariantId `ltree:install-ltree-v1` |
| Contract storage type `ltree` (codec-instance)       | planned | TS contract source (not PSL)                             |

**Hierarchy operators** (return `pg/bool@1`)

| SQL              | API method                 | Status  |
| ---------------- | -------------------------- | ------- |
| `ltree @> ltree` | `path.isAncestorOf(rhs)`   | planned |
| `ltree <@ ltree` | `path.isDescendantOf(rhs)` | planned |

**Pattern-matching operators** (return `pg/bool@1`)

| SQL                 | API method                          | Arg                 | Status  |
| ------------------- | ----------------------------------- | ------------------- | ------- |
| `ltree ~ lquery`    | `path.matchesLquery(pattern)`       | string (lquery)     | planned |
| `ltree ? lquery[]`  | `path.matchesLqueryArray(patterns)` | string[] (lquery[]) | planned |
| `ltree @ ltxtquery` | `path.matchesLtxtquery(query)`      | string (ltxtquery)  | planned |

**Scalar functions**

| SQL                                   | API method                        | Returns      | Status                  |
| ------------------------------------- | --------------------------------- | ------------ | ----------------------- |
| `nlevel(ltree)`                       | `path.nlevel()`                   | `pg/int4@1`  | planned                 |
| `subltree(ltree, start, end)`         | `path.subltree(start, end)`       | `pg/ltree@1` | planned                 |
| `subpath(ltree, offset, len)`         | `path.subpath(offset, len?)`      | `pg/ltree@1` | planned (2 overloads)   |
| `index(a, b)` / `index(a, b, offset)` | `path.indexOf(other, offset?)`    | `pg/int4@1`  | planned (2 overloads)   |
| `lca(ltree[])`                        | `ltree.lca(paths)` (namespace fn) | `pg/ltree@1` | planned — API shape TBD |

#### Tier 2 — Concatenation & Conversion

**Concatenation** (return `pg/ltree@1`)

| SQL    | API method | Status |
| ------ | ---------- | ------ | ---------------------------------------- | ----------------------- |
| `ltree |            | ltree` | `path.concat(rhs)`                       | planned                 |
| `ltree |            | text`  | `path.concatText(rhs)`                   | planned                 |
| `text  |            | ltree` | `ltree.prependText(text)` (namespace fn) | planned — API shape TBD |

**Conversion**

| SQL                 | API method                            | Returns      | Status                  |
| ------------------- | ------------------------------------- | ------------ | ----------------------- |
| `ltree2text(ltree)` | `path.toText()`                       | `pg/text@1`  | planned                 |
| `text2ltree(text)`  | `ltree.fromText(text)` (namespace fn) | `pg/ltree@1` | planned — API shape TBD |

#### Tier 3 — Array first-match operators (return `pg/ltree@1`)

These take `ltree[]` on the **left** (receiver), returning the first matching array entry. Requires
array-typed receiver support — the most complex slice; delivered last.

| SQL                    | API method                         | Status  |
| ---------------------- | ---------------------------------- | ------- |
| `ltree[] ?@> ltree`    | `paths.firstAncestorOf(rhs)`       | planned |
| `ltree[] ?<@ ltree`    | `paths.firstDescendantOf(rhs)`     | planned |
| `ltree[] ?~ lquery`    | `paths.firstMatchLquery(pattern)`  | planned |
| `ltree[] ?@ ltxtquery` | `paths.firstMatchLtxtquery(query)` | planned |

### 5.2 Out-of-Scope (tracked, not built unless revisited)

| Feature                                  | SQL                   | Status       | Reason                                                                                                |
| ---------------------------------------- | --------------------- | ------------ | ----------------------------------------------------------------------------------------------------- |
| Boolean array variant                    | `ltree[] @> ltree`    | out-of-scope | "Less useful" per scope decision; low marginal cost once array receiver exists — revisit after Tier 3 |
| Boolean array variant                    | `ltree[] <@ ltree`    | out-of-scope | same                                                                                                  |
| Boolean array variant                    | `ltree[] ~ lquery`    | out-of-scope | same                                                                                                  |
| Boolean array variant                    | `ltree[] ? lquery[]`  | out-of-scope | same                                                                                                  |
| Boolean array variant                    | `ltree[] @ ltxtquery` | out-of-scope | same                                                                                                  |
| GiST index (`gist_ltree_ops`, `siglen`)  | DDL                   | out-of-scope | DDL/index story owned by Prisma's index system separately                                             |
| GiST array index (`gist__ltree_ops`)     | DDL                   | out-of-scope | same                                                                                                  |
| Hash index over `ltree`                  | DDL                   | out-of-scope | same                                                                                                  |
| B-tree index over `ltree`                | DDL                   | out-of-scope | Automatic for `<,<=,=,>=,>`; no extension op needed                                                   |
| `lquery` as a first-class column type    | —                     | out-of-scope | By Q1 decision — lquery is a validated string param, not stored row data                              |
| `ltxtquery` as a first-class column type | —                     | out-of-scope | same                                                                                                  |

### 5.3 Progress tracking

- `docs/feature-support.md` — the matrix above, maintained as statuses flip `planned → in-progress → supported`.
- `docs/progress/` — per-tier progress logs (what landed, what's blocked, what's next).
- `docs/decisions/` — ADRs for non-trivial decisions (codec shape, lquery param handling, array receiver, API shape for free functions).

---

## 6. Code Style

### 6.1 Query operator pattern (the core of this extension)

Each operator in `src/core/descriptor-meta.ts` follows the postgis/pgvector pattern. Example for a
hierarchy operator:

```ts
isAncestorOf: {
  self: { codecId: LTREE_CODEC_ID },
  impl: (self, other) => {
    const selfCodec = codecOf(self);
    return buildOperation({
      method: 'isAncestorOf',
      args: [toExpr(self, selfCodec), toExpr(other, selfCodec)],
      returns: { codecId: 'pg/bool@1', nullable: false },
      lowering: {
        targetFamily: 'sql',
        strategy: 'function',
        template: '{{self}} @> {{arg0}}',
      },
    });
  },
},
```

For pattern-match operators, the argument is a validated string param cast to the SQL type:

```ts
matchesLquery: {
  self: { codecId: LTREE_CODEC_ID },
  impl: (self, pattern) => {
    const selfCodec = codecOf(self);
    return buildOperation({
      method: 'matchesLquery',
      args: [toExpr(self, selfCodec), toExpr(pattern, { codecId: 'pg/text@1' })],
      returns: { codecId: 'pg/bool@1', nullable: false },
      lowering: {
        targetFamily: 'sql',
        strategy: 'function',
        template: '{{self}} ~ ({{arg0}})::lquery',
      },
    });
  },
},
```

### 6.2 Codec pattern (non-parameterized, Case 1)

```ts
class LtreeCodec extends CodecImpl<"pg/ltree@1", readonly ["equality", "order"], string, string> {
  async encode(value: string, _ctx: CodecCallContext): Promise<string> {
    assertValidLtree(value); // label syntax + length validation
    return value;
  }
  async decode(wire: string, _ctx: CodecCallContext): Promise<string> {
    return wire;
  }
}

class LtreeDescriptor extends CodecDescriptorImpl<void> {
  override readonly codecId = "pg/ltree@1" as const;
  override readonly traits = ["equality", "order"] as const;
  override readonly targetTypes = ["ltree"] as const;
  override readonly paramsSchema = voidParamsSchema;
  override renderOutputType(): string {
    return "string";
  }
  override factory(): (ctx: CodecInstanceContext) => LtreeCodec {
    const shared = new LtreeCodec(this);
    return () => shared; // constant factory — runtime relies on this
  }
}
```

### 6.3 Conventions (from framework AGENTS.md + our Vite+ setup)

- No `any`. No `@ts-expect-error` outside negative type tests. No `@ts-nocheck`.
- No bare `as` in production code; use `blindCast`/`castAs` from `@prisma-next/utils/casts` if unavoidable. `as const` and test files are exempt.
- No comments unless necessary; prefer self-expressing code. (Doc comments on public exports are fine, mirroring pgvector.)
- Don't add file extensions to imports.
- Use `arktype`, not zod, for param schemas.
- Don't re-export except in `exports/` folders.
- Don't branch on target; use adapters.
- Tests: omit "should" phrasing; assert whole result shapes with `toEqual`/snapshot.
- Test imports from `vite-plus/test` (enforced by `vite-plus/prefer-vite-plus-imports: error`).
- Every concrete subclass member touching inherited members carries `override`.

---

## 7. Testing Strategy

### 7.1 Levels

| Level                 | What                                                                                                                            | Tooling               | Mirrors                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| Unit — codecs         | encode/decode round-trip, label validation, dimension/limit enforcement                                                         | `vp test` (vitest)    | pgvector `test/codecs.test.ts`                                               |
| Unit — operations     | query operator lowering golden tests (AST is `OperationExpr`, `lowering.template` matches expected)                             | `vp test`             | pgvector `test/operations.test.ts`                                           |
| Unit — column types   | `ltree()` returns correct `ColumnTypeDescriptor` with `codecId`/`nativeType`/`typeParams`                                       | `vp test`             | pgvector `test/column-types.test.ts`                                         |
| Unit — pack authoring | authoring type namespace validates (`satisfies AuthoringTypeNamespace`)                                                         | `vp test`             | pgvector `test/pack.authoring.test.ts`                                       |
| Unit — descriptor     | pack metadata (`kind`, `id`, `familyId`, `targetId`, `version`), codec registry, codec descriptor presence, `create()` instance | `vp test`             | pgvector `test/descriptor.test.ts`                                           |
| Integration           | end-to-end: `CREATE EXTENSION ltree`, create table with `ltree` column, insert, query via operators, assert rows + SQL          | `vp test` with PGlite | pgvector `test/rich-adapter.test.ts`, `control-adapter-lower-parity.test.ts` |

### 7.2 Framework

- `vitest` via Vite+; imports from `vite-plus/test` (`import { describe, expect, it } from 'vite-plus/test'`).
- Integration tests use PGlite (ltree is a trusted extension — PGlite supports it). Harness setup
  mirrors pgvector's adapter tests (`@prisma-next/adapter-postgres`); exact wiring confirmed during
  implementation against `.sync/prisma-next/`.
- Coverage config lives in the `test` block of `vite.config.ts` (NOT a `vitest.config.ts` — Vite+
  convention). `include: ['src/**/*.ts']`, excluding `dist`, `test`, `exports/`, `types.ts`,
  `contract.ts`, `contract.d.ts`, config files.

### 7.3 Coverage

- Start at a healthy threshold (e.g. 90% lines/branches/functions/statements) and ramp toward
  pgvector's 95% as the package matures. Final threshold set in the `test` block of
  `vite.config.ts` (Task 6.1).

### 7.4 What must be true before any operator ships

- Golden lowering test asserts the exact `template` and `returns` codec.
- Codec round-trip test passes for valid input and rejects invalid labels.
- Integration test proves the SQL executes against PGlite and returns expected rows.

---

## 8. Boundaries

### Always do

- Run `vp check` and `vp test` before considering work done; `vp run ready` before a release.
- Write the failing test first (TDD), then implement.
- Verify every SPI shape against `.sync/prisma-next/` (source-driven) — never guess framework types.
- Update `docs/feature-support.md` status when a feature lands or slips.
- Record non-trivial decisions as ADRs in `docs/decisions/`.
- Exact-pin `@prisma-next/*@0.14.0`; never use `workspace:` (standalone repo).
- Mirror pgvector file structure and naming unless there's a documented reason to deviate.

### Ask first

- Changing the package name, codec id, space id, or any invariantId (these are immutable once published).
- Changing `engines.node` or the Node major version assumption.
- Adding a new npm dependency.
- Deviating from the locked scope (§5) — e.g. pulling a tracked out-of-scope feature in, or cutting an in-scope one.
- Publishing to npm or pushing to GitHub (only when the user explicitly requests it).
- Changing the contract source format (TS vs PSL).

### Never do

- Commit `.sync/prisma-next/` (gitignored — reference only).
- Commit secrets, API keys, or credentials.
- Use `any`, `@ts-nocheck`, or suppress biome/oxlint lints.
- Add backwards-compat exports unless asked.
- Re-export from one file in another except in `exports/` folders.
- Branch on target (use adapters).
- Assume a framework SPI shape without reading it in `.sync/prisma-next/`.

---

## 9. Success Criteria

1. `vp run ready` passes clean (check + test + build) for `packages/extension-ltree/`.
2. `prisma-next contract emit` produces `src/contract.{json,d.ts}` declaring the `ltree` storage type.
3. The baseline migration installs `ltree` and carries invariantId `ltree:install-ltree-v1`; `node migration.ts` re-emits `ops.json`/`migration.json` deterministically.
4. `pg/ltree@1` codec round-trips valid label paths and rejects invalid ones (unit test).
5. Every Tier 1 operator has a golden lowering test asserting the exact SQL template + return codec.
6. Every Tier 1 operator has a PGlite integration test proving it executes and returns expected rows.
7. `docs/feature-support.md` exists and lists every ltree feature with an accurate status.
8. The package `exports` map exposes all six entrypoints (`/control`, `/runtime`, `/codec-types`, `/operation-types`, `/column-types`, `/pack`).
9. Tier 2 and Tier 3 features are either shipped or tracked as `planned`/`out-of-scope` with a clear next step.

---

## 10. Open Questions

1. **Node version**: framework reference requires `>=24`; our root says `>=22.12.0`. Confirm the user's
   shell Node satisfies `>=24` (run `node -v`). If not, decide whether to lower the extension's
   `engines.node` or require Node 24.
2. **lquery/ltxtquery param handling**: cast-in-template (`{{arg0}})::lquery`) vs. registering
   lightweight param-only codecs. Cast-in-template is simpler and matches "validated string param"
   (Q1 decision); confirm during implementation via doubt-driven-development.
3. **Free-function API shape** (`lca`, `text2ltree`, `text || ltree`): the query-operation pattern is
   method-on-column (`self` + args). Free functions (no `self`, or `text` on the left) need a
   different lowering shape. Decide whether to expose as namespace functions on the `ltree` export
   or as methods with swapped semantics. ADR candidate.
4. **Array receiver for Tier 3** (`ltree[] ?@> ltree`): needs an `ltree[]`-typed `self`. Decide whether
   to register an array codec, use array-of-ltree expressions, or model `ltree[]` columns. ADR
   candidate; this gates Tier 3.
5. **`resolveIdentityValue` for ltree**: pgvector provides a zero-vector identity. ltree has no obvious
   identity literal. Decide whether to return `null`, a default root path, or skip the hook. Confirm
   against framework expectations during implementation.
6. **`prisma-next` CLI invocation in Vite+ repo**: confirm `pnpm exec prisma-next contract emit` works
   from `packages/extension-ltree/` with the `@prisma-next/cli` dev dep, or wire it as a `vp run`
   script. Resolve during scaffolding.
7. **Coverage threshold start**: 90% then ramp to 95%, or start at 95%? Confirm.
8. **Phased delivery cadence**: ship Tier 1 as `0.1.0`, Tier 2 as `0.2.0`, Tier 3 as `0.3.0`? Or
   one release? (Replaces the npm stub `0.0.1`.)

---

## 11. Reference Path Map

| What                                           | Path                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| pgvector reference (closest analog)            | `.sync/prisma-next/packages/3-extensions/pgvector/`                                |
| postgis reference (multi-operator)             | `.sync/prisma-next/packages/3-extensions/postgis/`                                 |
| Codec authoring guide (Case 1 = ltree pattern) | `docs/prisma-next/codec-authoring-guide.md`                                        |
| Naming & layout conventions                    | `docs/prisma-next/extension-packs-naming-and-layout.md`                            |
| Extension architecture hub                     | `docs/prisma-next/ecosystem-extensions-and-packs.md`                               |
| ltree reference                                | `docs/ltree/postgresql-ltree-reference.md`                                         |
| Extension author upgrade skill                 | `.sync/prisma-next/skills/extension-author/prisma-next-extension-upgrade/SKILL.md` |

---

## 12. Phased Delivery (preview — detailed task breakdown follows in planning-and-task-breakdown)

- **Phase 0 — Scaffold**: `packages/extension-ltree/` from pgvector structure; package.json, configs,
  empty source tree. Verify `vp check`/`vp test` run (even if empty).
- **Phase 1 — Tier 1 vertical slice**: codec + contract + migration + column helper + hierarchy ops
  - tests (unit + integration). End-to-end thin slice before breadth.
- **Phase 2 — Tier 1 breadth**: pattern-match ops + scalar fns + their tests.
- **Phase 3 — Tier 2**: concatenation + conversion + tests. Resolve free-function ADR.
- **Phase 4 — Tier 3**: array first-match ops + tests. Resolve array-receiver ADR.
- **Phase 5 — Polish**: coverage threshold, `docs/feature-support.md` finalized, ADRs, replace npm stub.
