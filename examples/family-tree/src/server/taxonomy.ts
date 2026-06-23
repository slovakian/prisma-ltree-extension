import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import type { Char } from "@prisma-next/target-postgres/codec-types";
import { db } from "../prisma/db";
import { closeRuntime, getRuntime } from "./runtime";

export type TaxonRow = {
  id: Char<36>;
  path: string;
  scientificName: string;
  commonName: string | null;
  rank: string;
  extinct: boolean;
  maOrigin: number | null;
  maExtinct: number | null;
  wikiUrl: string;
  thumbnailUrl: string | null;
};

const HOMO_SAPIENS = "Catarrhini.Hominoidea.Hominidae.Homininae.Hominini.Homo.Homo_sapiens";
const MANDRILLUS_SPHINX =
  "Catarrhini.Cercopithecoidea.Cercopithecidae.Cercopithecinae.Mandrillus.Mandrillus_sphinx";
const PAN_TROGLODYTES = "Catarrhini.Hominoidea.Hominidae.Homininae.Hominini.Pan.Pan_troglodytes";
const HOMO = "Catarrhini.Hominoidea.Hominidae.Homininae.Hominini.Homo";
export const REFERENCE_PATHS = {
  HOMO_SAPIENS,
  MANDRILLUS_SPHINX,
  PAN_TROGLODYTES,
  HOMO,
} as const;

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

export async function graftTaxonQuery(parentPath: string, label: string): Promise<TaxonRow> {
  await getRuntime();
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
    commonName: null,
    rank: "species",
    extinct: false,
    maOrigin: null,
    maExtinct: null,
    wikiUrl: "",
    thumbnailUrl: null,
  });
}

export const getTaxa = createServerFn({ method: "GET" }).handler(() => getTaxaQuery());

export const getLineage = createServerFn({ method: "POST" })
  .validator((path: string) => path)
  .handler(({ data }) => getLineageQuery(data));

export const getSubtree = createServerFn({ method: "POST" })
  .validator((path: string) => path)
  .handler(({ data }) => getSubtreeQuery(data));

export const searchLquery = createServerFn({ method: "POST" })
  .validator((pattern: string) => pattern)
  .handler(({ data }) => searchLqueryQuery(data));

export const searchLqueryArray = createServerFn({ method: "POST" })
  .validator((patterns: string[]) => patterns)
  .handler(({ data }) => searchLqueryArrayQuery(data));

export const searchLtxtquery = createServerFn({ method: "POST" })
  .validator((query: string) => query)
  .handler(({ data }) => searchLtxtqueryQuery(data));

export const getGeneration = createServerFn({ method: "POST" })
  .validator((depth: number) => depth)
  .handler(({ data }) => getGenerationQuery(data));

export const lineageSlice = createServerFn({ method: "POST" })
  .validator((input: { path: string; from: number; to?: number }) => input)
  .handler(({ data }) => lineageSliceQuery(data.path, data.from, data.to));

export const lineageSubtree = createServerFn({ method: "POST" })
  .validator((input: { path: string; start: number; end: number }) => input)
  .handler(({ data }) => lineageSubtreeQuery(data.path, data.start, data.end));

export const indexOfBranch = createServerFn({ method: "POST" })
  .validator((input: { a: string; b: string; offset?: number }) => input)
  .handler(({ data }) => indexOfBranchQuery(data.a, data.b, data.offset));

export const getMrcaViaLca = createServerFn({ method: "POST" })
  .validator((input: { a: string; b: string }) => input)
  .handler(({ data }) => getMrcaViaLcaQuery(data.a, data.b));

export const getMrcaViaOps = createServerFn({ method: "POST" })
  .validator((input: { a: string; b: string }) => input)
  .handler(({ data }) => getMrcaViaOpsQuery(data.a, data.b));

export const graftTaxon = createServerFn({ method: "POST" })
  .validator((input: { parentPath: string; label: string }) => input)
  .handler(({ data }) => graftTaxonQuery(data.parentPath, data.label));

export { closeRuntime };
