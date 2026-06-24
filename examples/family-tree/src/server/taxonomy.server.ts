import { randomUUID } from "node:crypto";
import type { Char } from "@prisma-next/target-postgres/codec-types";
import { db } from "../prisma/db";
import { validateTaxonLabel } from "../lib/taxon-label";
import { closeRuntime, getRuntime } from "./runtime";
import type { TaxonRow } from "./taxonomy";

/**
 * Server-only data layer for the taxonomy.
 *
 * Everything here pulls the prisma-next Postgres runtime (`../prisma/db`), which
 * depends on Node-only globals like `Buffer`. It must therefore never reach the
 * client bundle. The client-facing surface lives in `./taxonomy.ts`, whose
 * `createServerFn` handlers `import()` this module lazily — so the compiler keeps
 * it out of the browser. The test suite imports these `*Query` functions
 * directly to exercise the real DB without the server-fn RPC wrapper.
 */

export { closeRuntime };

export async function getTaxaQuery(): Promise<TaxonRow[]> {
  await getRuntime();
  return db.orm.public.Taxon.orderBy((t) => t.path.asc()).all();
}

export async function getLineageQuery(path: string): Promise<TaxonRow[]> {
  await getRuntime();
  return db.orm.public.Taxon.where((t) => t.path.isAncestorOf(path))
    .orderBy((t) => t.path.asc())
    .all();
}

export async function getSubtreeQuery(path: string): Promise<TaxonRow[]> {
  await getRuntime();
  return db.orm.public.Taxon.where((t) => t.path.isDescendantOf(path))
    .orderBy((t) => t.path.asc())
    .all();
}

export async function searchLqueryQuery(pattern: string): Promise<TaxonRow[]> {
  await getRuntime();
  return db.orm.public.Taxon.where((t) => t.path.matchesLquery(pattern))
    .orderBy((t) => t.path.asc())
    .all();
}

export async function searchLqueryArrayQuery(patterns: string[]): Promise<TaxonRow[]> {
  await getRuntime();
  return db.orm.public.Taxon.where((t) => t.path.matchesLqueryArray(patterns as never))
    .orderBy((t) => t.path.asc())
    .all();
}

export async function searchLtxtqueryQuery(query: string): Promise<TaxonRow[]> {
  await getRuntime();
  return db.orm.public.Taxon.where((t) => t.path.matchesLtxtquery(query))
    .orderBy((t) => t.path.asc())
    .all();
}

export async function getGenerationQuery(depth: number): Promise<TaxonRow[]> {
  await getRuntime();
  return db.orm.public.Taxon.where((t) => t.path.nlevel().eq(depth))
    .orderBy((t) => t.path.asc())
    .all();
}

export async function lineageSliceQuery(
  path: string,
  from: number,
  to?: number,
): Promise<string | null> {
  await getRuntime();
  const plan = db.sql.public.taxon
    .select("slice", (f, fns) =>
      to === undefined ? fns.subpath(f.path, from) : fns.subpath(f.path, from, to),
    )
    .where((f, fns) => fns.eq(f.path, path))
    .limit(1)
    .build();
  const rows = await db.runtime().execute(plan);
  return (rows[0] as { slice: string | null } | undefined)?.slice ?? null;
}

export async function lineageSubtreeQuery(
  path: string,
  start: number,
  end: number,
): Promise<string | null> {
  await getRuntime();
  const plan = db.sql.public.taxon
    .select("slice", (f, fns) => fns.subltree(f.path, start, end))
    .where((f, fns) => fns.eq(f.path, path))
    .limit(1)
    .build();
  const rows = await db.runtime().execute(plan);
  return (rows[0] as { slice: string | null } | undefined)?.slice ?? null;
}

export async function indexOfBranchQuery(a: string, b: string, offset?: number): Promise<number> {
  await getRuntime();
  const plan = db.sql.public.taxon
    .select("idx", (f, fns) =>
      offset === undefined ? fns.indexOf(f.path, b) : fns.indexOf(f.path, b, offset),
    )
    .where((f, fns) => fns.eq(f.path, a))
    .limit(1)
    .build();
  const rows = await db.runtime().execute(plan);
  return (rows[0] as { idx: number } | undefined)?.idx ?? -1;
}

export async function getMrcaViaLcaQuery(a: string, b: string): Promise<TaxonRow | null> {
  await getRuntime();
  const plan = db.sql.public.taxon
    .select("mrca", (f, fns) => fns.lca(f.path, b))
    .where((f, fns) => fns.eq(f.path, a))
    .limit(1)
    .build();
  const rows = await db.runtime().execute(plan);
  const mrcaPath = (rows[0] as { mrca: string | null } | undefined)?.mrca;
  if (!mrcaPath) return null;
  return db.orm.public.Taxon.first({ path: mrcaPath });
}

export async function getMrcaViaOpsQuery(a: string, b: string): Promise<TaxonRow | null> {
  await getRuntime();
  const rows = await db.orm.public.Taxon.where((t) => t.path.isAncestorOf(a))
    .where((t) => t.path.isAncestorOf(b))
    .orderBy((t) => t.path.nlevel().desc())
    .take(1)
    .all();
  return rows[0] ?? null;
}

/** Optional metadata a visitor can attach to a grafted taxon. */
export type GraftOptions = {
  commonName?: string | null;
  rank?: string;
  extinct?: boolean;
};

export async function graftTaxonQuery(
  parentPath: string,
  label: string,
  options: GraftOptions = {},
): Promise<TaxonRow> {
  await getRuntime();
  // Re-validate server-side: the client form blocks invalid labels, but the
  // server is the trust boundary — never insert a label the rule rejects.
  const labelError = validateTaxonLabel(label);
  if (labelError) {
    throw new Error(labelError);
  }
  const pathPlan = db.sql.public.taxon
    .select("newPath", (f, fns) => fns.concatText(f.path, label))
    .where((f, fns) => fns.eq(f.path, parentPath))
    .limit(1)
    .build();
  const pathRows = await db.runtime().execute(pathPlan);
  const newPath = (pathRows[0] as { newPath: string | null } | undefined)?.newPath;
  if (!newPath) {
    throw new Error(`Parent taxon not found: ${parentPath}`);
  }
  return db.orm.public.Taxon.create({
    id: randomUUID() as Char<36>,
    path: newPath,
    scientificName: label.replace(/_/g, " "),
    commonName: options.commonName?.trim() || null,
    rank: options.rank?.trim() || "species",
    // `extinct` is set explicitly here — never via a contract `@default`, which
    // the pinned CLI emits as a malformed boolean literal that `db:plan` rejects.
    extinct: options.extinct ?? false,
    maOrigin: null,
    maExtinct: null,
    // Empty `wiki_url` is the sentinel that marks a row as visitor-grafted (every
    // seeded taxon carries a real Wikipedia URL); `pruneUserTaxaQuery` deletes
    // exactly these rows to restore the seeded state.
    wikiUrl: "",
    thumbnailUrl: null,
  });
}

/**
 * Remove every visitor-grafted taxon, restoring the canvas to its seeded state.
 * Grafted rows are precisely those with an empty `wiki_url` (see `graftTaxonQuery`).
 * Returns the number of rows removed.
 */
export async function pruneUserTaxaQuery(): Promise<number> {
  await getRuntime();
  const all = await getTaxaQuery();
  const grafted = all.filter((t) => t.wikiUrl === "");
  if (grafted.length === 0) return 0;
  const plan = db.sql.public.taxon
    .delete()
    .where((f, fns) => fns.eq(f.wiki_url, ""))
    .build();
  await db.runtime().execute(plan);
  return grafted.length;
}
