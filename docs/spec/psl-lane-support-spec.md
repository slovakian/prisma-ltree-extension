# Spec: PSL Contract Lane Support for `prisma-ltree`

**Status:** Draft (awaiting approval)
**Date:** 2026-06-21
**Branch:** `feat/psl-lane-support`
**Author:** Jason (+ Claude)

## Objective

`prisma-ltree` consumers can today author their data contract in the **TypeScript
lane** (`contract.ts` via `defineContract`). prisma-next supports a second, _canonical_
authoring surface — the **PSL lane** (`contract.prisma`) — and the official extensions
(pgvector, postgis) are consumable from it. `prisma-ltree` has never been **proven,
tested, or documented** against the PSL lane.

This work establishes and guarantees **feature parity between the PSL and TS lanes** for
`prisma-ltree`: a consumer can declare ltree columns in `contract.prisma` and get a
contract identical to the one the TS lane produces.

**Success looks like:** a `contract.prisma` using `ltree.Ltree` / `ltree.LtreeArray`
emits a `contract.json` byte-identical (modulo source-path metadata) to the equivalent
`contract.ts`, proven by an automated parity test, recorded in an ADR, and documented on
the docs site.

## Feasibility findings (resolved during investigation)

These are settled and are **not** open questions:

1. **The two "lanes" are consumer-facing authoring surfaces**, both lowering to the same
   Contract IR: `contract.ts` (`defineContract`) and `contract.prisma` (PSL). Framework
   design goal: "both surfaces produce identical compiled contracts."

2. **An extension's only PSL surface is its own namespace constructor.** Consumers write:

   ```prisma
   types {
     Path  = ltree.Ltree
     Paths = ltree.LtreeArray
   }
   model Page { id String @id; path Path }
   ```

   The `ltree` namespace resolves from `ltreeAuthoringTypes` (`src/core/authoring.ts`),
   surfaced through `ltreePackMeta.authoring.type` and spread into the `/control`
   descriptor that `prisma-next.config.ts` composes via `extensions: [...]`.

3. **`@db.Ltree` is impossible for a third-party extension.** `@db.*` is backed by a
   static `NATIVE_TYPE_SPECS` table hardcoded in the framework's `contract-psl` package
   (postgres-core types only — `db.Uuid`, `db.Timestamptz`, …). There is no extension
   hook; `checkUncomposedNamespace` only recognizes `db`, familyId, targetId,
   field-preset namespaces, and composed extensions. Adding `@db.Ltree` would require a
   PR to prisma-next core — **out of scope**.

4. **We are ~80% already wired.** Our `ltreeAuthoringTypes` (with `ltree.Ltree` and
   `ltree.LtreeArray`), `ltreePackMeta`, and `/control` descriptor are structurally
   identical to postgis's. `AuthoringTypeConstructorDescriptor.args` is optional, so our
   zero-arg constructors are type-valid.

5. **ltree is a _better_ PSL fit than pgvector.** pgvector is the documented TS-only
   exception precisely because PSL cannot register a parameterised base type (`vector(N)`).
   ltree's `ltree` / `ltree[]` are non-parameterised — exactly what PSL can represent.

## Tech Stack

- Framework pins: `@prisma-next/*` @ `0.14.0` (do not bump — see
  `docs/prisma-next/versioning-and-compatibility.md`).
- Emit tooling available in-repo: `@prisma-next/cli`, `@prisma-next/postgres` façade
  (config + contract-builder) as devDeps of `packages/extension-ltree`.
- Test runner: Vitest via `vp test`.

## Commands

```
Install:   vp install
Check:     vp check                 # format, lint, typecheck
Test:      vp test
Build:     vp run build
Ready:     vp run ready             # full validation incl. check-pins
Pins:      pnpm run check-pins      # in packages/extension-ltree
```

## Project Structure (files this work touches)

```
packages/extension-ltree/
  src/core/authoring.ts              # ltreeAuthoringTypes — verify, no expected change
  test/
    psl-lane/                        # NEW — PSL fixtures + parity tests
      contract.prisma                # NEW — PSL fixture exercising ltree.Ltree(+Array)
      contract.ts                    # NEW — equivalent TS fixture for parity comparison
      psl-parity.test.ts             # NEW — emit both, assert IR parity
docs/
  decisions/ADR-004-psl-lane-support.md   # NEW — records the namespace-constructor decision
  spec/psl-lane-support-spec.md            # THIS FILE
apps/web/                            # docs-site page: authoring ltree in PSL (Piece 4)
```

## Code Style

Match existing test conventions (see `test/operations.test.ts`, `test/pack-authoring.test.ts`):
no "should" in test names; assert whole shapes; ground every claim against `.sync/prisma-next/`.

```typescript
// psl-parity.test.ts — shape
describe("PSL lane parity", () => {
  it("ltree.Ltree column emits the same storage type as the TS lane", () => {
    const fromPsl = emitFromPsl("test/psl-lane/contract.prisma");
    const fromTs = emitFromTs("test/psl-lane/contract.ts");
    expect(normalize(fromPsl)).toEqual(normalize(fromTs)); // normalize strips source-path meta
  });
});
```

## Testing Strategy

- **Parity test (primary):** emit a PSL contract and the equivalent TS contract; assert
  the Contract IR (`contract.json`) is identical after normalizing source-path/hash
  metadata. This is the proof of feature parity.
- **Resolution test:** assert `ltree.Ltree` / `ltree.LtreeArray` resolve to the correct
  `codecId` + `nativeType` and that omitting `extensions: [ltree]` produces the expected
  `PSL_EXTENSION_NAMESPACE_NOT_COMPOSED` diagnostic.
- Tests live under `packages/extension-ltree/test/psl-lane/`, run via `vp test`.

## Boundaries

- **Always:** ground every framework claim against `.sync/prisma-next/`; run `vp check`
  - `vp test` before any commit; keep `@prisma-next/*` at `0.14.0`.
- **Ask first:** adding an example/demo app (deferred — see Open Questions); any change to
  the public authoring surface (`ltreeAuthoringTypes` shape); bumping framework pins.
- **Never:** modify `@db.*`/core framework files; commit `.sync/` contents; edit emitted
  artifacts (`contract.json` / `contract.d.ts`) by hand.

## Success Criteria

1. A `contract.prisma` referencing `ltree.Ltree` and `ltree.LtreeArray` emits without
   error when `ltree` is composed in `extensions: [...]`.
2. The emitted Contract IR is identical to the equivalent TS-lane contract (parity test
   green).
3. Omitting the extension from config yields a clear
   `PSL_EXTENSION_NAMESPACE_NOT_COMPOSED` diagnostic naming `ltree`.
4. `ADR-004` records the namespace-constructor decision and why `@db.Ltree` is out of scope.
5. Docs site has a page showing ltree authoring in both PSL and TS.
6. `vp run ready` passes (incl. `check-pins`).

## Implementation Pieces (session-sized)

Ordered by dependency. Each is a standalone session.

- [x] **Piece 1 — Validate the lane (de-risk). ✅ DONE 2026-06-21.**
  - Acceptance: a `contract.prisma` with `ltree.Ltree`(+`LtreeArray`) emits successfully
    via the in-repo emit path; confirm whether the no-paren form `Path = ltree.Ltree`
    parses (the one unvalidated grammar risk) or whether `ltree.Ltree()` is required.
  - Verify: emit runs clean; inspect resulting `contract.json` for correct storage types.
  - Files: `test/psl-lane/contract.prisma`, a throwaway emit harness/script.
  - **Result:** Emit path is `defineConfig({ contract: './contract.prisma', extensions: [ltree] })`
    from `@prisma-next/postgres/config`, emitted via `prisma-next contract emit --config <path>`
    (mirrors `prisma-next-postgis-demo`). The emitted columns are correct:
    `path → pg/ltree@1 / ltree`, `breadcrumbs → pg/ltree-array@1 / ltree[]`, and the named
    types `Path`/`Paths` resolve to the matching `codec-instance` entries.
  - **Grammar finding (resolves Open Question 2):** the **paren form is required** —
    `Path = ltree.Ltree()` / `Paths = ltree.LtreeArray()`. The no-paren form
    `Path = ltree.Ltree` fails with `PSL_INVALID_TYPES_MEMBER`. This matches postgis's
    `postgis.Geometry(4326)`; zero-arg constructors still need the call parentheses.

- [x] **Piece 2 — Parity + resolution tests. ✅ DONE 2026-06-21.**
  - Acceptance: automated test proves PSL-emitted IR == TS-emitted IR; resolution +
    missing-extension diagnostic tests pass.
  - Verify: `vp test` green.
  - Files: `test/psl-lane/{contract.prisma,contract.ts,psl-parity.test.ts}` plus three
    thin emit configs (`prisma.config.ts`, `ts.config.ts`, `no-ext.config.ts`).
  - **Result:** `psl-parity.test.ts` emits both lanes in-process via
    `executeContractEmit` (`@prisma-next/cli/control-api`) into temp dirs and compares.
    Parity is **stronger than the spec required**: the two `contract.json`s are
    **byte-identical including `profileHash`/`storageHash`** — 0.14.0 threads no per-lane
    source metadata, so `expect(fromPsl).toEqual(fromTs)` holds with no normalization.
    The TS twin authors the same shape via `type.ltree.Ltree()` / `type.ltree.LtreeArray()`
    - `field.id.uuidv4String()` (matching PSL `String @id @default(uuid())` → `sql/char@1`
      length 36). Resolution test asserts `Path`/`Paths` → `pg/ltree@1`/`pg/ltree-array@1`
      and the bound columns. Missing-extension test asserts the thrown `CliStructuredError`
      carries `meta.diagnostics` with `PSL_EXTENSION_NAMESPACE_NOT_COMPOSED` naming `ltree`.
      `vp test` (123 tests) and `vp check` green.

- [x] **Piece 3 — ADR + decision record. ✅ DONE 2026-06-21.**
  - Acceptance: `ADR-004-psl-lane-support.md` written (namespace constructor; `@db.*` out
    of scope; parity guarantee), CLAUDE.md implementation-status section updated.
  - Verify: links resolve; `vp check`.
  - Files: `docs/decisions/ADR-004-psl-lane-support.md`, `CLAUDE.md`.
  - **Result:** ADR-004 records the namespace-constructor decision, the four grounded
    source findings (one IR / two lanes, namespace-only surface, no `@db.*` hook,
    paren-required), and the rejected alternatives. `AGENTS.md` (the real file behind the
    `CLAUDE.md` symlink) gains a "PSL contract lane — ✅ Parity proven" status block
    linking ADR-004 and the parity test. `vp check` green.

- [x] **Piece 4 — Docs-site coverage. ✅ DONE 2026-06-21.**
  - Acceptance: docs page shows authoring ltree columns in PSL and TS side by side;
    consumer README/quickstart gets a PSL snippet.
  - Verify: `apps/web` builds; manual render check.
  - Files: `apps/web/...`, `packages/extension-ltree/README.md`.
  - **Result:** New `apps/web/content/docs/authoring.mdx` ("Authoring Contracts") presents
    the PSL and TS lanes side by side via Fumadocs `<Tabs>` (registered in
    `src/components/mdx.tsx`), grounded in the `test/psl-lane/` fixtures — including the
    parens-required note, the missing-extension diagnostic, the byte-identical-IR parity
    claim, and the `@db.Ltree` out-of-scope explanation linking ADR-004. Sidebar order set
    in `content/docs/meta.json` (`index → getting-started → authoring → operations`);
    `index.mdx` and `getting-started.mdx` link the new page, and the stale
    "PSL authoring … not available yet" line in `getting-started.mdx` is corrected. The
    consumer `README.md` Contract section gains a PSL snippet alongside the TS one. `vp build`
    is green (the `authoring` route compiles). _Note:_ `vp check` flags one pre-existing
    lint error + warning in `src/lib/ltree-demo-data.*` (committed in 911778a, untouched by
    this piece) — out of scope here.

## Open Questions

1. **Example/demo app** — deferred (Jason chose "Prove + test + docs"). Revisit as a
   later piece if an end-to-end runnable PSL demo is wanted (mirroring
   `prisma-next-postgis-demo`).
2. ~~**No-paren grammar** — does `Path = ltree.Ltree` parse, or is `ltree.Ltree()` needed
   for a zero-arg constructor?~~ **RESOLVED (Piece 1):** the paren form is required.
   `Path = ltree.Ltree` fails with `PSL_INVALID_TYPES_MEMBER`; use `ltree.Ltree()`.
