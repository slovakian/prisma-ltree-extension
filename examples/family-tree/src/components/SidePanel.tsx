import { useEffect, useMemo, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import type { TaxonRow } from "../server/taxonomy";
import { lineageSlice } from "../server/taxonomy";
import { parentPath } from "~/lib/layout";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

/**
 * Per-node inspector. Opening it fires one fetch per ltree operator family and
 * renders each result as a labelled `Card` carrying the operator name and its
 * SQL lowering — the viewer doubles as a live operator showcase. Lineage and
 * subtree come pre-fetched from the canvas selection (they also drive the
 * highlight); this panel additionally fetches the `subpath` slice and computes
 * the branch point against a pinned comparison taxon.
 */

export type SidePanelProps = {
  taxon: TaxonRow;
  /** Ancestors-of-and-including the taxon (ltree `@>`), path-ascending. */
  lineage: TaxonRow[];
  /** The taxon and its descendants (ltree `<@`), path-ascending. */
  subtree: TaxonRow[];
  /** Full taxa set, for the branch-point comparison picker. */
  allTaxa: TaxonRow[];
  onClose: () => void;
  onRecenter: (path: string) => void;
};

const labels = (path: string) => path.split(".");
const lastLabel = (path: string) => path.slice(path.lastIndexOf(".") + 1);

/** Geologic era string from the seeded `ma_origin` / `ma_extinct` columns. */
function eraLabel(taxon: TaxonRow): string | null {
  if (taxon.maOrigin == null) return null;
  const origin = `${taxon.maOrigin} Ma`;
  if (taxon.extinct) return `${origin} → ${taxon.maExtinct ?? 0} Ma (extinct)`;
  return `${origin} → present`;
}

/** A small operator header: the method name + its SQL lowering template. */
function OperatorTag({ name, sql }: { name: string; sql: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="secondary" className="font-mono">
        {name}
      </Badge>
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] text-muted-foreground">
        {sql}
      </code>
    </div>
  );
}

/** Clickable breadcrumb trail; each crumb recenters the canvas on that path. */
function Breadcrumbs({
  paths,
  current,
  onRecenter,
}: {
  paths: string[];
  current: string;
  onRecenter: (path: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
      {paths.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 ? <span className="text-muted-foreground">›</span> : null}
          <button
            type="button"
            onClick={() => onRecenter(p)}
            className={cn(
              "rounded px-1 py-0.5 font-medium italic transition-colors hover:bg-muted",
              p === current ? "text-primary" : "text-foreground/80",
            )}
            title={`Recenter on ${lastLabel(p)}`}
          >
            {lastLabel(p)}
          </button>
        </span>
      ))}
    </div>
  );
}

export function SidePanel({
  taxon,
  lineage,
  subtree,
  allTaxa,
  onClose,
  onRecenter,
}: SidePanelProps) {
  // subpath(self, 1): the lineage with the Catarrhini root dropped — fetched
  // from the DB so the panel exercises the real `subpath` lowering.
  const [slice, setSlice] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setSlice(null);
    void lineageSlice({ data: { path: taxon.path, from: 1 } }).then((s) => {
      if (alive) setSlice(s);
    });
    return () => {
      alive = false;
    };
  }, [taxon.path]);

  const directChildren = useMemo(
    () => subtree.filter((t) => parentPath(t.path) === taxon.path),
    [subtree, taxon.path],
  );

  // Branch-point: pin a second taxon and report where the two paths diverge.
  // The split depth is the length of the longest shared label prefix — i.e.
  // nlevel(lca(a, b)) — computed here so the panel updates without a round trip.
  const [compare, setCompare] = useState<string | null>(null);
  const branch = useMemo(() => {
    if (!compare) return null;
    const a = labels(taxon.path);
    const b = labels(compare);
    let depth = 0;
    while (depth < a.length && depth < b.length && a[depth] === b[depth]) depth++;
    return { depth, mrca: a.slice(0, depth).join("."), aLabel: a[depth], bLabel: b[depth] };
  }, [compare, taxon.path]);

  const era = eraLabel(taxon);
  const descendantCount = subtree.length - 1;

  // subpath crumbs reconstruct absolute ancestor paths for recentering: crumb i
  // of subpath(self, 1) is full-path label i+1, so its prefix is labels[0..i+1].
  const sliceLabels = slice ? slice.split(".") : [];
  const fullLabels = labels(taxon.path);

  return (
    <div className="pointer-events-auto absolute top-3 right-3 bottom-3 z-10 flex w-[22rem] max-w-[calc(100%-1.5rem)] flex-col gap-3 overflow-y-auto rounded-xl border bg-background/95 p-3 shadow-xl backdrop-blur">
      {/* Header */}
      <Card size="sm">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="absolute top-0 right-3"
            aria-label="Close panel"
          >
            <X />
          </Button>
          <CardTitle className="flex items-center gap-1.5 pr-6 text-base italic">
            {taxon.scientificName}
            {taxon.wikiUrl ? (
              <a
                href={taxon.wikiUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-muted-foreground hover:text-primary"
                aria-label={`Wikipedia: ${taxon.scientificName}`}
              >
                <ExternalLink className="size-3.5" />
              </a>
            ) : null}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="capitalize">
              {taxon.rank}
            </Badge>
            {taxon.extinct ? <Badge variant="destructive">extinct</Badge> : null}
            {taxon.commonName ? (
              <span className="text-xs text-muted-foreground">{taxon.commonName}</span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          {era ? <div className="text-muted-foreground">{era}</div> : null}
          <div className="flex items-baseline justify-between gap-2">
            <code
              className="truncate font-mono text-[0.7rem] text-foreground/70"
              title={taxon.path}
            >
              {taxon.path}
            </code>
            <span className="shrink-0 text-muted-foreground">depth {lineage.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Ancestry — isAncestorOf (@>) */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Ancestry</CardTitle>
          <OperatorTag name="isAncestorOf" sql="path @> $1" />
        </CardHeader>
        <CardContent>
          <Breadcrumbs
            paths={lineage.map((t) => t.path)}
            current={taxon.path}
            onRecenter={onRecenter}
          />
        </CardContent>
      </Card>

      {/* Subtree — isDescendantOf (<@) */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Subtree</CardTitle>
          <OperatorTag name="isDescendantOf" sql="path <@ $1" />
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs">
          <div className="text-muted-foreground">
            {descendantCount} descendant{descendantCount === 1 ? "" : "s"}
          </div>
          {directChildren.length > 0 ? (
            <ul className="space-y-0.5">
              {directChildren.map((c) => (
                <li key={c.path}>
                  <button
                    type="button"
                    onClick={() => onRecenter(c.path)}
                    className="rounded px-1 py-0.5 italic transition-colors hover:bg-muted"
                  >
                    {c.scientificName}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-muted-foreground">No children — this is a tip.</div>
          )}
        </CardContent>
      </Card>

      {/* Lineage slice — subpath */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Lineage slice</CardTitle>
          <OperatorTag name="subpath" sql="subpath(path, 1)" />
        </CardHeader>
        <CardContent>
          {slice == null ? (
            <div className="text-xs text-muted-foreground">…</div>
          ) : sliceLabels.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
              {sliceLabels.map((lbl, i) => {
                const abs = fullLabels.slice(0, i + 2).join(".");
                return (
                  <span key={abs} className="flex items-center gap-1">
                    {i > 0 ? <span className="text-muted-foreground">›</span> : null}
                    <button
                      type="button"
                      onClick={() => onRecenter(abs)}
                      className="rounded px-1 py-0.5 font-medium italic transition-colors hover:bg-muted"
                      title={`Recenter on ${lbl}`}
                    >
                      {lbl}
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Root taxon — no slice.</div>
          )}
        </CardContent>
      </Card>

      {/* Branch point — pin a second taxon */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Branch point</CardTitle>
          <OperatorTag name="lca" sql="lca(path, $1)" />
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Select value={compare ?? undefined} onValueChange={setCompare}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="Pin a taxon to compare…" />
            </SelectTrigger>
            <SelectContent>
              {allTaxa
                .filter((t) => t.path !== taxon.path)
                .map((t) => (
                  <SelectItem key={t.path} value={t.path}>
                    {t.scientificName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {branch ? (
            <p className="text-muted-foreground">
              Paths diverge at depth{" "}
              <span className="font-semibold text-foreground">{branch.depth}</span>
              {branch.mrca ? (
                <>
                  {" "}
                  — last shared clade{" "}
                  <button
                    type="button"
                    onClick={() => onRecenter(branch.mrca)}
                    className="font-medium text-primary italic hover:underline"
                  >
                    {lastLabel(branch.mrca)}
                  </button>
                  , then <span className="italic">{branch.aLabel}</span> vs{" "}
                  <span className="italic">{branch.bLabel}</span>.
                </>
              ) : (
                " — no shared root."
              )}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
