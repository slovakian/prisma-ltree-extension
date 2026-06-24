import { useEffect, useMemo, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import type { TaxonRow } from "../server/taxonomy";
import { lineageSlice } from "../server/taxonomy.functions";
import { parentPath } from "~/lib/layout";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

/**
 * Per-node inspector — a print-inspired detail card (spec §3.1 / §3.3). The
 * header reads kicker → serif name → italic scientific name → hairline; the
 * body is a stack of hairline-separated operator sections, each fetching one
 * ltree operator family and rendering its result alongside the operator name
 * and SQL lowering, so the card doubles as a live operator showcase. Lineage
 * and subtree come pre-fetched from the canvas selection (they also drive the
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
  if (taxon.extinct) return `${origin} → ${taxon.maExtinct ?? 0} Ma`;
  return `${origin} → present`;
}

/** Mono uppercase rust kicker — the established overlay idiom (spec §3.1). */
function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{children}</p>
  );
}

/** A key/value detail row: mono uppercase key, serif value, hairline-aligned. */
function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <div className="w-20 shrink-0 pt-px font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {k}
      </div>
      <div className="min-w-0 flex-1 font-heading text-[15px] leading-snug text-foreground">
        {children}
      </div>
    </div>
  );
}

/** A small operator header: the method name (rust chip) + its SQL lowering. */
function OperatorTag({ name, sql }: { name: string; sql: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 font-mono text-[0.7rem] text-primary">
        {name}
      </span>
      <code className="font-mono text-[0.7rem] text-muted-foreground">{sql}</code>
    </div>
  );
}

/** A hairline-topped operator section: mono label → operator tag → body. */
function Section({
  title,
  name,
  sql,
  children,
}: {
  title: string;
  name: string;
  sql: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border/70 px-5 py-4">
      <div className="mb-2.5 flex flex-col gap-1.5">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
        <OperatorTag name={name} sql={sql} />
      </div>
      {children}
    </section>
  );
}

/** A recenter button rendered as an italic serif label (scientific names). */
function CrumbButton({
  label,
  path,
  active,
  onRecenter,
}: {
  label: string;
  path: string;
  active?: boolean;
  onRecenter: (path: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRecenter(path)}
      className={cn(
        "rounded px-1 py-0.5 font-heading italic transition-colors hover:bg-primary/10",
        active ? "text-primary" : "text-foreground/80",
      )}
      title={`Recenter on ${label}`}
    >
      {label}
    </button>
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
    <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 text-[15px]">
      {paths.map((p, i) => (
        <span key={p} className="flex items-center gap-0.5">
          {i > 0 ? <span className="text-muted-foreground">›</span> : null}
          <CrumbButton
            label={lastLabel(p)}
            path={p}
            active={p === current}
            onRecenter={onRecenter}
          />
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

  const parent = parentPath(taxon.path);
  const kicker = parent ? `${taxon.rank} · ${lastLabel(parent)}` : taxon.rank;
  // When a common name exists it is the roman serif headline and the scientific
  // name drops to the italic sub; otherwise the scientific name is the headline
  // (and reads italic, as scientific names always do).
  const displayName = taxon.commonName ?? taxon.scientificName;

  // subpath crumbs reconstruct absolute ancestor paths for recentering: crumb i
  // of subpath(self, 1) is full-path label i+1, so its prefix is labels[0..i+1].
  const sliceLabels = slice ? slice.split(".") : [];
  const fullLabels = labels(taxon.path);

  return (
    <div className="pointer-events-auto absolute top-3 right-3 bottom-3 z-10 flex w-[22rem] max-w-[calc(100%-1.5rem)] flex-col overflow-y-auto rounded-md border bg-card/95 shadow-[0_12px_40px_rgba(60,44,28,0.18)] backdrop-blur motion-safe:animate-[panelIn_0.28s_cubic-bezier(0.2,0.7,0.2,1)]">
      {/* Header — kicker → serif name → italic scientific name */}
      <header className="relative px-5 pt-5 pb-4">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          aria-label="Close panel"
        >
          <X />
        </Button>
        <Kicker>{kicker}</Kicker>
        <h2
          className={cn(
            "mt-1.5 flex items-baseline gap-1.5 pr-8 font-heading text-2xl leading-tight font-medium text-foreground",
            taxon.commonName == null && "italic",
          )}
        >
          {displayName}
          {taxon.wikiUrl ? (
            <a
              href={taxon.wikiUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-muted-foreground transition-colors hover:text-primary"
              aria-label={`Wikipedia: ${taxon.scientificName}`}
            >
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </h2>
        {taxon.commonName != null ? (
          <p className="mt-0.5 font-heading text-[15px] text-muted-foreground italic">
            {taxon.scientificName}
          </p>
        ) : null}

        <div className="mt-4 space-y-2.5">
          {era ? <Row k="Range">{era}</Row> : null}
          <Row k="Status">{taxon.extinct ? "Extinct" : "Extant"}</Row>
          <Row k="Lineage">depth {lineage.length}</Row>
          <Row k="Subtree">
            {descendantCount} descendant{descendantCount === 1 ? "" : "s"}
          </Row>
        </div>
      </header>

      {/* Ancestry — isAncestorOf (@>) */}
      <Section title="Ancestry" name="isAncestorOf" sql="path @> $1">
        <Breadcrumbs
          paths={lineage.map((t) => t.path)}
          current={taxon.path}
          onRecenter={onRecenter}
        />
      </Section>

      {/* Subtree — isDescendantOf (<@) */}
      <Section title="Subtree" name="isDescendantOf" sql="path <@ $1">
        {directChildren.length > 0 ? (
          <ul className="flex flex-col gap-0.5">
            {directChildren.map((c) => (
              <li key={c.path}>
                <CrumbButton label={c.scientificName} path={c.path} onRecenter={onRecenter} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-heading text-[15px] text-muted-foreground italic">
            No children — this is a tip.
          </p>
        )}
      </Section>

      {/* Lineage slice — subpath */}
      <Section title="Lineage slice" name="subpath" sql="subpath(path, 1)">
        {slice == null ? (
          <p className="font-mono text-xs text-muted-foreground">…</p>
        ) : sliceLabels.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 text-[15px]">
            {sliceLabels.map((lbl, i) => {
              const abs = fullLabels.slice(0, i + 2).join(".");
              return (
                <span key={abs} className="flex items-center gap-0.5">
                  {i > 0 ? <span className="text-muted-foreground">›</span> : null}
                  <CrumbButton label={lbl} path={abs} onRecenter={onRecenter} />
                </span>
              );
            })}
          </div>
        ) : (
          <p className="font-heading text-[15px] text-muted-foreground italic">
            Root taxon — no slice.
          </p>
        )}
      </Section>

      {/* Branch point — pin a second taxon (lca) */}
      <Section title="Branch point" name="lca" sql="lca(path, $1)">
        <div className="space-y-2.5">
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
            <p className="font-heading text-[15px] leading-snug text-muted-foreground">
              Paths diverge at depth{" "}
              <span className="font-medium text-foreground">{branch.depth}</span>
              {branch.mrca ? (
                <>
                  {" — last shared clade "}
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
        </div>
      </Section>

      {/* Raw ltree path — mono breadcrumb footer */}
      <footer className="mt-auto border-t border-border/70 px-5 py-3.5">
        <p
          className="font-mono text-[10px] leading-relaxed tracking-[0.06em] break-words text-muted-foreground"
          title={taxon.path}
        >
          {fullLabels.join("  ›  ")}
        </p>
      </footer>
    </div>
  );
}
