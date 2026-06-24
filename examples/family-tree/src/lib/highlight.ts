import type { TaxonRow } from "../server/taxonomy";

/**
 * On-canvas highlight model for the phylogeny viewer.
 *
 * This module is pure — it never touches React Flow or the DOM. It turns the
 * *results of ltree server queries* (lineage = `isAncestorOf` `@>`, subtree =
 * `isDescendantOf` `<@`, MRCA = `lca()`) into membership sets, and resolves the
 * display kind for any node or edge. The canvas layer (`TreeCanvas`) reads
 * `nodeKind` / `edgeKind` to paint strokes and rings; everything stays islanded
 * from the rendering library so the highlight rules can be unit-tested without a
 * browser.
 *
 * Key invariant the edge rule relies on: a node's parent→child edge is painted
 * kind `K` iff *both* endpoints belong to the kind-`K` set. Because `getLineage`
 * and `getSubtree` are inclusive of the selected node (ltree `@>`/`<@` match
 * equality), the selected node sits in both sets, so the lineage chain and the
 * subtree fan stay continuous with no muted gaps in between.
 */

export type HighlightKind = "selected" | "lineage" | "subtree" | "mrca" | "search";

export type HighlightState = {
  /** Ancestors-of-and-including the focus (or, in MRCA mode, both leaves). */
  readonly lineage: ReadonlySet<string>;
  /** The focus node and all of its descendants. */
  readonly subtree: ReadonlySet<string>;
  /** The clicked taxon, rendered with a distinct ring. */
  readonly selectedPath: string | null;
  /** The resolved common ancestor, rendered in the MRCA color. */
  readonly mrcaPath: string | null;
  /**
   * Free-form match set: the taxa returned by a query control (lquery /
   * lquery-array / ltxtquery search, or a generation-depth `nlevel` filter).
   * Painted in the `search` color; unlike lineage/subtree it carries no implied
   * tree shape, so generation matches (siblings across the tree) light up as a
   * scatter while subtree-shaped searches read as connected fans.
   */
  readonly match: ReadonlySet<string>;
};

export const EMPTY_HIGHLIGHT: HighlightState = {
  lineage: new Set(),
  subtree: new Set(),
  selectedPath: null,
  mrcaPath: null,
  match: new Set(),
};

/** True when any highlight is active — drives the "fade the rest" muting. */
export function isActive(state: HighlightState): boolean {
  return (
    state.lineage.size > 0 ||
    state.subtree.size > 0 ||
    state.selectedPath !== null ||
    state.mrcaPath !== null ||
    state.match.size > 0
  );
}

/**
 * Highlight produced by clicking a taxon: its lineage back to the root in the
 * `lineage` color and its subtree fanning out in the `subtree` color, with the
 * clicked node itself marked `selected`.
 */
export function selectionHighlight(
  selectedPath: string,
  lineage: readonly TaxonRow[],
  subtree: readonly TaxonRow[],
): HighlightState {
  return {
    lineage: new Set(lineage.map((t) => t.path)),
    subtree: new Set(subtree.map((t) => t.path)),
    selectedPath,
    mrcaPath: null,
    match: new Set(),
  };
}

/**
 * Highlight produced by a query control: every taxon the server query returned
 * (lquery / lquery-array / ltxtquery search, or an `nlevel` generation filter)
 * lights up in the `search` color and the rest fade. Edges paint `search` only
 * between two matched endpoints, so a subtree-shaped match reads as a connected
 * fan while a generation match reads as a scatter.
 */
export function matchHighlight(paths: Iterable<string>): HighlightState {
  return {
    lineage: new Set(),
    subtree: new Set(),
    selectedPath: null,
    mrcaPath: null,
    match: new Set(paths),
  };
}

/**
 * Highlight produced by the MRCA picker: both leaves' root-to-leaf paths in the
 * `lineage` color (so you can see them converge) and the common ancestor marked
 * `mrca`. Paths through the MRCA are exactly the overlap of the two lineages.
 */
export function mrcaHighlight(
  mrcaPath: string,
  lineageA: readonly TaxonRow[],
  lineageB: readonly TaxonRow[],
): HighlightState {
  const lineage = new Set<string>();
  for (const t of lineageA) lineage.add(t.path);
  for (const t of lineageB) lineage.add(t.path);
  return { lineage, subtree: new Set(), selectedPath: null, mrcaPath, match: new Set() };
}

/** Resolve the display kind for a node, or `null` when it should be muted. */
export function nodeKind(path: string, state: HighlightState): HighlightKind | null {
  if (path === state.mrcaPath) return "mrca";
  if (path === state.selectedPath) return "selected";
  if (state.lineage.has(path)) return "lineage";
  if (state.subtree.has(path)) return "subtree";
  if (state.match.has(path)) return "search";
  return null;
}

/** Resolve the display kind for a parent→child edge, or `null` when muted. */
export function edgeKind(
  source: string,
  target: string,
  state: HighlightState,
): Exclude<HighlightKind, "selected" | "mrca"> | null {
  if (state.lineage.has(source) && state.lineage.has(target)) return "lineage";
  if (state.subtree.has(source) && state.subtree.has(target)) return "subtree";
  if (state.match.has(source) && state.match.has(target)) return "search";
  return null;
}
