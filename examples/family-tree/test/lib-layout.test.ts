import { describe, expect, it } from "vite-plus/test";
import type { TaxonRow } from "~/server/taxonomy";
import { buildTree, parentPath } from "~/lib/layout";

/**
 * Pure layout unit test — no DB. A synthetic path set drives `buildTree` and
 * asserts the two invariants the canvas depends on: exactly one node per unique
 * path (no taxon renders twice), and one parent→child edge per non-root path.
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

// A small dendrogram with one root, two branches, and a tip-dense leaf set.
const PATHS = [
  "Root",
  "Root.A",
  "Root.A.A1",
  "Root.A.A2",
  "Root.B",
  "Root.B.B1",
  "Root.B.B1.B1a",
  "Root.B.B1.B1b",
];

describe("parentPath", () => {
  it("strips the last label, null for a root", () => {
    expect(parentPath("Root")).toBeNull();
    expect(parentPath("Root.A")).toBe("Root");
    expect(parentPath("Root.B.B1.B1a")).toBe("Root.B.B1");
  });
});

describe("buildTree", () => {
  const taxa = PATHS.map(row);
  const { nodes, edges } = buildTree(taxa);

  it("emits exactly one node per unique path", () => {
    expect(nodes).toHaveLength(PATHS.length);
    const ids = nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(PATHS.length);
    expect(new Set(ids)).toEqual(new Set(PATHS));
  });

  it("emits one parent→child edge per non-root path", () => {
    expect(edges).toHaveLength(PATHS.length - 1);
    for (const e of edges) {
      expect(e.source).toBe(parentPath(e.target));
    }
  });

  it("lays the root out left of its descendants (horizontal orientation)", () => {
    const root = nodes.find((n) => n.id === "Root")!;
    const tip = nodes.find((n) => n.id === "Root.B.B1.B1a")!;
    expect(root.position.x).toBeLessThan(tip.position.x);
  });

  it("returns empty arrays for an empty taxon list", () => {
    expect(buildTree([])).toEqual({ nodes: [], edges: [] });
  });
});
