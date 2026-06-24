import { describe, expect, it } from "vite-plus/test";
import type { TaxonRow } from "~/server/taxonomy";
import {
  EMPTY_HIGHLIGHT,
  edgeKind,
  isActive,
  matchHighlight,
  mrcaHighlight,
  nodeKind,
  selectionHighlight,
} from "~/lib/highlight";

/**
 * Pure highlight-state unit test — no DB, no React Flow. Drives the membership
 * builders with synthetic taxon rows and asserts the node/edge kind resolution
 * that the canvas paints from.
 */

function row(path: string): TaxonRow {
  const label = path.slice(path.lastIndexOf(".") + 1);
  return {
    id: path as TaxonRow["id"],
    path,
    scientificName: label.replace(/_/g, " "),
    commonName: null,
    rank: "species",
    extinct: false,
    maOrigin: null,
    maExtinct: null,
    wikiUrl: "",
    thumbnailUrl: null,
  };
}

// Catarrhini → Hominidae → Homo → Homo_sapiens, plus a Pan sibling subtree.
const ROOT = "Catarrhini";
const HOMINIDAE = "Catarrhini.Hominidae";
const HOMO = "Catarrhini.Hominidae.Homo";
const SAPIENS = "Catarrhini.Hominidae.Homo.Homo_sapiens";
const PAN = "Catarrhini.Hominidae.Pan";
const TROGLODYTES = "Catarrhini.Hominidae.Pan.Pan_troglodytes";

describe("selectionHighlight", () => {
  // Lineage of Homo_sapiens (inclusive) + its (leaf) subtree of just itself.
  const lineage = [ROOT, HOMINIDAE, HOMO, SAPIENS].map(row);
  const subtree = [SAPIENS].map(row);
  const state = selectionHighlight(SAPIENS, lineage, subtree);

  it("marks the clicked node selected and ancestors lineage", () => {
    expect(nodeKind(SAPIENS, state)).toBe("selected");
    expect(nodeKind(HOMO, state)).toBe("lineage");
    expect(nodeKind(ROOT, state)).toBe("lineage");
  });

  it("mutes nodes outside the lineage/subtree", () => {
    expect(nodeKind(PAN, state)).toBeNull();
    expect(nodeKind(TROGLODYTES, state)).toBeNull();
  });

  it("paints an unbroken lineage chain to the root", () => {
    expect(edgeKind(ROOT, HOMINIDAE, state)).toBe("lineage");
    expect(edgeKind(HOMINIDAE, HOMO, state)).toBe("lineage");
    expect(edgeKind(HOMO, SAPIENS, state)).toBe("lineage");
  });

  it("does not paint edges into muted siblings", () => {
    expect(edgeKind(HOMINIDAE, PAN, state)).toBeNull();
  });
});

describe("selectionHighlight on an internal clade paints its subtree", () => {
  // Clicking Hominidae: lineage = Catarrhini.Hominidae; subtree = the clade.
  const lineage = [ROOT, HOMINIDAE].map(row);
  const subtree = [HOMINIDAE, HOMO, SAPIENS, PAN, TROGLODYTES].map(row);
  const state = selectionHighlight(HOMINIDAE, lineage, subtree);

  it("paints internal subtree edges, not the feeding edge from the parent", () => {
    expect(edgeKind(HOMINIDAE, HOMO, state)).toBe("subtree");
    expect(edgeKind(HOMO, SAPIENS, state)).toBe("subtree");
    expect(edgeKind(PAN, TROGLODYTES, state)).toBe("subtree");
    // The edge from the root into the selected clade is lineage, never subtree.
    expect(edgeKind(ROOT, HOMINIDAE, state)).toBe("lineage");
  });
});

describe("mrcaHighlight", () => {
  const lineageA = [ROOT, HOMINIDAE, HOMO, SAPIENS].map(row);
  const lineageB = [ROOT, HOMINIDAE, PAN, TROGLODYTES].map(row);
  const state = mrcaHighlight(HOMINIDAE, lineageA, lineageB);

  it("marks the common ancestor mrca and both paths lineage", () => {
    expect(nodeKind(HOMINIDAE, state)).toBe("mrca");
    expect(nodeKind(SAPIENS, state)).toBe("lineage");
    expect(nodeKind(TROGLODYTES, state)).toBe("lineage");
  });

  it("converges both leaf paths through the MRCA", () => {
    expect(edgeKind(HOMINIDAE, HOMO, state)).toBe("lineage");
    expect(edgeKind(HOMINIDAE, PAN, state)).toBe("lineage");
  });
});

describe("matchHighlight", () => {
  // A subtree-shaped search (e.g. lquery `*.Hominidae.*`) and a generation
  // scatter (e.g. nlevel = 3) both flow through the same match set.
  const state = matchHighlight([HOMINIDAE, HOMO, SAPIENS]);

  it("paints matched nodes search and mutes the rest", () => {
    expect(nodeKind(HOMINIDAE, state)).toBe("search");
    expect(nodeKind(SAPIENS, state)).toBe("search");
    expect(nodeKind(PAN, state)).toBeNull();
  });

  it("paints search edges only between two matched endpoints", () => {
    expect(edgeKind(HOMINIDAE, HOMO, state)).toBe("search");
    expect(edgeKind(HOMO, SAPIENS, state)).toBe("search");
    // PAN is not matched, so the feeding edge into it stays muted.
    expect(edgeKind(HOMINIDAE, PAN, state)).toBeNull();
  });

  it("is active and does not bleed into other highlight kinds", () => {
    expect(isActive(state)).toBe(true);
    expect(state.lineage.size).toBe(0);
    expect(state.selectedPath).toBeNull();
    expect(state.mrcaPath).toBeNull();
  });
});

describe("EMPTY_HIGHLIGHT", () => {
  it("is inactive and resolves nothing", () => {
    expect(isActive(EMPTY_HIGHLIGHT)).toBe(false);
    expect(nodeKind(SAPIENS, EMPTY_HIGHLIGHT)).toBeNull();
    expect(edgeKind(ROOT, HOMINIDAE, EMPTY_HIGHLIGHT)).toBeNull();
  });
});
