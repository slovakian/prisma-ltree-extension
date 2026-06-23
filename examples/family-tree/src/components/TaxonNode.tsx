import { Handle, type NodeProps, Position } from "@xyflow/react";
import { ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { NODE_HEIGHT, NODE_WIDTH, type TaxonFlowNode } from "~/lib/nodes";

/**
 * Custom React Flow node for a single taxon.
 *
 * The label body sits on a solid `bg-card` surface with a soft drop-shadow
 * halo so it stays legible across crossing dendrogram edges and the warm
 * canvas — never bare floating text (spec "Label legibility"). Registered on
 * the canvas via the `nodeTypes` map declared in `TreeCanvas.tsx`; the mapping
 * object must live outside the component per React Flow guidance.
 */

/** Two-letter clade glyph for taxa without a Wikipedia page image. */
function cladeGlyph(scientificName: string): string {
  const cleaned = scientificName.replace(/[^A-Za-z ]/g, "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

export function TaxonNode({ data }: NodeProps<TaxonFlowNode>) {
  const { taxon } = data;
  return (
    <div
      className={cn(
        "group flex items-center gap-2.5 rounded-lg border bg-card px-2.5 py-1.5 text-card-foreground",
        "shadow-[0_1px_3px_rgba(0,0,0,0.12),0_0_0_4px_var(--card)]",
        "transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.18),0_0_0_4px_var(--card)]",
        taxon.extinct && "border-dashed opacity-90",
      )}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
    >
      <Handle type="target" position={Position.Left} className="!border-0 !bg-border" />

      <Avatar size="lg" className="shrink-0">
        {taxon.thumbnailUrl ? (
          <AvatarImage src={taxon.thumbnailUrl} alt={taxon.scientificName} />
        ) : null}
        <AvatarFallback className="text-[0.7rem] font-semibold">
          {cladeGlyph(taxon.scientificName)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate text-sm font-semibold italic leading-tight">
            {taxon.scientificName}
          </span>
          {taxon.wikiUrl ? (
            <a
              href={taxon.wikiUrl}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
              aria-label={`Wikipedia: ${taxon.scientificName}`}
            >
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="capitalize">
            {taxon.rank}
          </Badge>
          {taxon.commonName ? (
            <span className="truncate text-xs text-muted-foreground">{taxon.commonName}</span>
          ) : taxon.extinct ? (
            <span className="truncate text-xs text-muted-foreground">extinct</span>
          ) : null}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!border-0 !bg-border" />
    </div>
  );
}
