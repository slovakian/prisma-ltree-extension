import { createServerFn } from "@tanstack/react-start";
import type { TaxonRow } from "./taxonomy";
import type { GraftInput } from "./taxonomy.server";
import {
  getGenerationHandler,
  getLineageHandler,
  getMrcaViaLcaHandler,
  getMrcaViaOpsHandler,
  getSubtreeHandler,
  getTaxaHandler,
  graftTaxonHandler,
  indexOfBranchHandler,
  lineageSliceHandler,
  lineageSubtreeHandler,
  pruneUserTaxaHandler,
  searchLqueryArrayHandler,
  searchLqueryHandler,
  searchLtxtqueryHandler,
} from "./taxonomy.server";

/**
 * Client-facing taxonomy server functions (RPC wrappers).
 *
 * Each `createServerFn` handler is an **inline** callback that delegates to a
 * handler from `taxonomy.server.ts`. The Start compiler extracts these inline
 * callbacks (together with their `taxonomy.server` import) into a server-side
 * provider module, replacing the caller-side references with RPC stubs. This
 * keeps the `.server.ts` import out of the client bundle and satisfies import
 * protection.
 *
 * Re-exports `TaxonRow` so callers can import both types and RPC functions from
 * a single module.
 */

export type { TaxonRow, GraftInput };

export const getTaxa = createServerFn({ method: "GET" }).handler(async () => {
  return getTaxaHandler();
});

export const getLineage = createServerFn({ method: "POST" })
  .validator((path: string) => path)
  .handler(async ({ data }) => {
    return getLineageHandler(data);
  });

export const getSubtree = createServerFn({ method: "POST" })
  .validator((path: string) => path)
  .handler(async ({ data }) => {
    return getSubtreeHandler(data);
  });

export const searchLquery = createServerFn({ method: "POST" })
  .validator((pattern: string) => pattern)
  .handler(async ({ data }) => {
    return searchLqueryHandler(data);
  });

export const searchLqueryArray = createServerFn({ method: "POST" })
  .validator((patterns: string[]) => patterns)
  .handler(async ({ data }) => {
    return searchLqueryArrayHandler(data);
  });

export const searchLtxtquery = createServerFn({ method: "POST" })
  .validator((query: string) => query)
  .handler(async ({ data }) => {
    return searchLtxtqueryHandler(data);
  });

export const getGeneration = createServerFn({ method: "POST" })
  .validator((depth: number) => depth)
  .handler(async ({ data }) => {
    return getGenerationHandler(data);
  });

export const lineageSlice = createServerFn({ method: "POST" })
  .validator((input: { path: string; from: number; to?: number }) => input)
  .handler(async ({ data }) => {
    return lineageSliceHandler(data.path, data.from, data.to);
  });

export const lineageSubtree = createServerFn({ method: "POST" })
  .validator((input: { path: string; start: number; end: number }) => input)
  .handler(async ({ data }) => {
    return lineageSubtreeHandler(data.path, data.start, data.end);
  });

export const indexOfBranch = createServerFn({ method: "POST" })
  .validator((input: { a: string; b: string; offset?: number }) => input)
  .handler(async ({ data }) => {
    return indexOfBranchHandler(data.a, data.b, data.offset);
  });

export const getMrcaViaLca = createServerFn({ method: "POST" })
  .validator((input: { a: string; b: string }) => input)
  .handler(async ({ data }) => {
    return getMrcaViaLcaHandler(data.a, data.b);
  });

export const getMrcaViaOps = createServerFn({ method: "POST" })
  .validator((input: { a: string; b: string }) => input)
  .handler(async ({ data }) => {
    return getMrcaViaOpsHandler(data.a, data.b);
  });

export const graftTaxon = createServerFn({ method: "POST" })
  .validator((input: GraftInput) => input)
  .handler(async ({ data }) => {
    return graftTaxonHandler(data);
  });

export const pruneUserTaxa = createServerFn({ method: "POST" }).handler(async () => {
  return pruneUserTaxaHandler();
});
