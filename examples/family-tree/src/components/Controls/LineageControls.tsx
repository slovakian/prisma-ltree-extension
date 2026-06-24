import { RotateCcw } from "lucide-react";
import type { TaxonRow } from "../../server/taxonomy";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

/**
 * Persistent "Selection" control in the aside: a color legend for the on-canvas
 * highlight kinds (each tied to its ltree operator) plus the global reset that
 * clears every highlight back to the flat canvas. The detailed per-node panels
 * live in `SidePanel`; this card is the always-visible anchor and reset.
 */

export type LineageControlsProps = {
  selected: TaxonRow | null;
  active: boolean;
  onReset: () => void;
};

const LEGEND = [
  { kind: "selected", label: "Selected", swatch: "bg-primary", note: "clicked taxon" },
  {
    kind: "lineage",
    label: "Lineage",
    swatch: "bg-[var(--lineage-foreground)]",
    note: "@> isAncestorOf",
  },
  {
    kind: "subtree",
    label: "Subtree",
    swatch: "bg-[var(--subtree-foreground)]",
    note: "<@ isDescendantOf",
  },
  { kind: "mrca", label: "MRCA", swatch: "bg-mrca", note: "lca() common ancestor" },
] as const;

export function LineageControls({ selected, active, onReset }: LineageControlsProps) {
  return (
    <Card className="gap-2 py-3">
      <CardHeader className="px-3">
        <CardTitle className="text-sm">Selection</CardTitle>
        <CardDescription className="text-xs">
          {selected ? (
            <>
              Inspecting <span className="font-medium italic">{selected.scientificName}</span>.
            </>
          ) : (
            "Click a taxon to inspect its lineage, subtree, and slices."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 px-3">
        <ul className="space-y-1">
          {LEGEND.map((l) => (
            <li key={l.kind} className="flex items-center gap-2 text-xs">
              <span className={`size-2.5 shrink-0 rounded-full ${l.swatch}`} aria-hidden />
              <span className="font-medium">{l.label}</span>
              <code className="ml-auto font-mono text-[0.7rem] text-muted-foreground">
                {l.note}
              </code>
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" className="w-full" onClick={onReset} disabled={!active}>
          <RotateCcw />
          Reset highlights
        </Button>
      </CardContent>
    </Card>
  );
}
