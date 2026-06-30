import { defineIndexTypes } from "@prisma-next/sql-contract/index-types";
import { type } from "arktype";

/**
 * Index types contributed by `prisma-ltree` to the per-contract index-type
 * registry (ADR 210). Registering `gist` lets consumers author GiST indexes on
 * `ltree` / `ltree[]` columns through the standard index surface —
 * `constraints.index([cols.path], { type: "gist" })` in the TypeScript lane and
 * `@@index([path], type: "gist")` in the PSL lane — instead of dropping to raw
 * SQL. The Postgres adapter lowers it to `CREATE INDEX … USING gist (…)`, and
 * PostgreSQL selects the correct default operator class (`gist_ltree_ops` for
 * `ltree`, `gist__ltree_ops` for `ltree[]`) from the column type.
 *
 * The options shape is **closed and empty** (`"+": "reject"`): default GiST
 * takes no storage parameters here. `gist_ltree_ops(siglen=…)` is an
 * operator-class typmod, not a `WITH (...)` storage parameter, so it cannot be
 * expressed through `options` without emitting wrong DDL — it is intentionally
 * out of scope (see ADR-005). Keeping options empty also keeps the PSL and TS
 * lanes byte-identical.
 */
export const ltreeIndexTypes = defineIndexTypes().add("gist", {
  options: type({ "+": "reject" }),
});

export type LtreeIndexTypes = typeof ltreeIndexTypes.IndexTypes;

/** Options shape accepted for a `type: "gist"` ltree index (currently none). */
export type GistIndexOptions = LtreeIndexTypes["gist"]["options"];
