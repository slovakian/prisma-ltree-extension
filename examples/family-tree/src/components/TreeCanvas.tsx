import { useEffect, useMemo, useState } from "react";
import { Background, BackgroundVariant, Controls, type NodeTypes, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TaxonRow } from "../server/taxonomy";
import { buildTree } from "~/lib/layout";
import { TaxonNode } from "./TaxonNode";

/**
 * React Flow wrapper for the phylogeny dendrogram.
 *
 * `nodeTypes` is declared module-level (immutable identity) per React Flow
 * guidance — re-creating it each render thrashes the canvas. The whole tree is
 * rendered client-only: TanStack Start SSR + React Flow's measured layout
 * produce hydration warnings, so we gate the `<ReactFlow>` mount behind a
 * `useEffect` flag and render a matching-height skeleton on the server. The
 * loader still streams the taxa down, so there's no extra fetch.
 */
const nodeTypes: NodeTypes = { taxon: TaxonNode };

export function TreeCanvas({ taxa }: { taxa: TaxonRow[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { nodes, edges } = useMemo(() => buildTree(taxa), [taxa]);

  if (!mounted) {
    return (
      <div className="grid size-full place-items-center text-sm text-muted-foreground">
        Loading tree…
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.2}
      maxZoom={1.75}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
    >
      <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="var(--border)" />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
