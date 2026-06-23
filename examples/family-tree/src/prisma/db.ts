import postgres from "@prisma-next/postgres/runtime";
import ltree from "prisma-ltree/runtime";
import contractJson from "./contract.json" with { type: "json" };
import type { Contract } from "./contract.d";

/**
 * The typed prisma-next client for this app.
 *
 * `extensions: [ltree]` registers the prisma-ltree runtime: the ltree codec and
 * the query operators (isAncestorOf, isDescendantOf, matchesLquery, nlevel, …)
 * that surface as methods on the `path` column in `db.orm`.
 */
export const db = postgres<Contract>({ contractJson, extensions: [ltree] });
