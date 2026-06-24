import { createServerFn } from "@tanstack/react-start";
import type { Char } from "@prisma-next/target-postgres/codec-types";

/**
 * Client-safe taxonomy surface.
 *
 * This module is imported by client components (for `TaxonRow` and to call the
 * server functions as RPC stubs), so it must stay free of the Postgres runtime.
 * Every handler `import()`s the server-only data layer (`./taxonomy.server`)
 * lazily; the TanStack Start compiler replaces handler bodies with a fetch on
 * the client, so that dynamic import — and the Buffer-using DB runtime behind it
 * — never lands in the browser bundle. The bare `*Query` functions used by the
 * test suite live in `./taxonomy.server`.
 */

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

export const getTaxa = createServerFn({ method: "GET" }).handler(async () => {
  const { getTaxaQuery } = await import("./taxonomy.server");
  return getTaxaQuery();
});

export const getLineage = createServerFn({ method: "POST" })
  .validator((path: string) => path)
  .handler(async ({ data }) => {
    const { getLineageQuery } = await import("./taxonomy.server");
    return getLineageQuery(data);
  });

export const getSubtree = createServerFn({ method: "POST" })
  .validator((path: string) => path)
  .handler(async ({ data }) => {
    const { getSubtreeQuery } = await import("./taxonomy.server");
    return getSubtreeQuery(data);
  });

export const searchLquery = createServerFn({ method: "POST" })
  .validator((pattern: string) => pattern)
  .handler(async ({ data }) => {
    const { searchLqueryQuery } = await import("./taxonomy.server");
    return searchLqueryQuery(data);
  });

export const searchLqueryArray = createServerFn({ method: "POST" })
  .validator((patterns: string[]) => patterns)
  .handler(async ({ data }) => {
    const { searchLqueryArrayQuery } = await import("./taxonomy.server");
    return searchLqueryArrayQuery(data);
  });

export const searchLtxtquery = createServerFn({ method: "POST" })
  .validator((query: string) => query)
  .handler(async ({ data }) => {
    const { searchLtxtqueryQuery } = await import("./taxonomy.server");
    return searchLtxtqueryQuery(data);
  });

export const getGeneration = createServerFn({ method: "POST" })
  .validator((depth: number) => depth)
  .handler(async ({ data }) => {
    const { getGenerationQuery } = await import("./taxonomy.server");
    return getGenerationQuery(data);
  });

export const lineageSlice = createServerFn({ method: "POST" })
  .validator((input: { path: string; from: number; to?: number }) => input)
  .handler(async ({ data }) => {
    const { lineageSliceQuery } = await import("./taxonomy.server");
    return lineageSliceQuery(data.path, data.from, data.to);
  });

export const lineageSubtree = createServerFn({ method: "POST" })
  .validator((input: { path: string; start: number; end: number }) => input)
  .handler(async ({ data }) => {
    const { lineageSubtreeQuery } = await import("./taxonomy.server");
    return lineageSubtreeQuery(data.path, data.start, data.end);
  });

export const indexOfBranch = createServerFn({ method: "POST" })
  .validator((input: { a: string; b: string; offset?: number }) => input)
  .handler(async ({ data }) => {
    const { indexOfBranchQuery } = await import("./taxonomy.server");
    return indexOfBranchQuery(data.a, data.b, data.offset);
  });

export const getMrcaViaLca = createServerFn({ method: "POST" })
  .validator((input: { a: string; b: string }) => input)
  .handler(async ({ data }) => {
    const { getMrcaViaLcaQuery } = await import("./taxonomy.server");
    return getMrcaViaLcaQuery(data.a, data.b);
  });

export const getMrcaViaOps = createServerFn({ method: "POST" })
  .validator((input: { a: string; b: string }) => input)
  .handler(async ({ data }) => {
    const { getMrcaViaOpsQuery } = await import("./taxonomy.server");
    return getMrcaViaOpsQuery(data.a, data.b);
  });

export type GraftInput = {
  parentPath: string;
  label: string;
  commonName?: string | null;
  rank?: string;
  extinct?: boolean;
};

export const graftTaxon = createServerFn({ method: "POST" })
  .validator((input: GraftInput) => input)
  .handler(async ({ data }) => {
    const { graftTaxonQuery } = await import("./taxonomy.server");
    return graftTaxonQuery(data.parentPath, data.label, {
      commonName: data.commonName,
      rank: data.rank,
      extinct: data.extinct,
    });
  });

export const pruneUserTaxa = createServerFn({ method: "POST" }).handler(async () => {
  const { pruneUserTaxaQuery } = await import("./taxonomy.server");
  return pruneUserTaxaQuery();
});
