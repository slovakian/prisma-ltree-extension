import { type ReactNode, useMemo, useState } from "react";
import { GitFork, Layers, Scissors } from "lucide-react";
import type { TaxonRow } from "../../server/taxonomy";
import {
  getGeneration,
  indexOfBranch,
  lineageSlice,
  lineageSubtree,
} from "../../server/taxonomy.functions";
import { type HighlightState, matchHighlight } from "~/lib/highlight";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

/**
 * Depth + slice showcase. Three ltree functions, each over the real column:
 *
 *  - Generation (`nlevel(path) = N`) — highlight every taxon at one tree depth.
 *  - Lineage slice (`subpath` / `subltree`) — extract a window of a taxon's path;
 *    each resulting label is a clickable crumb that recenters the canvas on the
 *    corresponding ancestor (reconstructed absolute path).
 *  - Locate (`indexOf`) — the 0-based position of a sub-path inside a taxon's
 *    path, or `-1` when that contiguous run of labels never appears.
 */

export type SliceControlsProps = {
  allTaxa: TaxonRow[];
  onApply: (state: HighlightState, ops: string[], focusPath?: string) => void;
  onRecenter: (path: string) => void;
};

const labels = (path: string) => path.split(".");

export function SliceControls({ allTaxa, onApply, onRecenter }: SliceControlsProps) {
  const maxDepth = useMemo(
    () => allTaxa.reduce((m, t) => Math.max(m, labels(t.path).length), 1),
    [allTaxa],
  );

  return (
    <Card className="gap-2 py-3">
      <CardHeader className="px-3">
        <CardTitle className="text-sm">Depth &amp; slices</CardTitle>
        <CardDescription className="text-xs">
          <code className="font-mono">nlevel</code>, <code className="font-mono">subpath</code>,{" "}
          <code className="font-mono">subltree</code>, and{" "}
          <code className="font-mono">indexOf</code> over the path column.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-3">
        <GenerationSection maxDepth={maxDepth} onApply={onApply} />
        <hr className="border-border/60" />
        <SliceSection allTaxa={allTaxa} onRecenter={onRecenter} />
        <hr className="border-border/60" />
        <BranchPointSection allTaxa={allTaxa} />
      </CardContent>
    </Card>
  );
}

/** `nlevel(path) = N` — highlight every taxon at one depth. */
function GenerationSection({
  maxDepth,
  onApply,
}: {
  maxDepth: number;
  onApply: (state: HighlightState, ops: string[], focusPath?: string) => void;
}) {
  const [depth, setDepth] = useState(Math.min(7, maxDepth));
  const [pending, setPending] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  async function run() {
    setPending(true);
    try {
      const rows = await getGeneration({ data: depth });
      setCount(rows.length);
      onApply(matchHighlight(rows.map((r) => r.path)), ["nlevel"], rows[0]?.path);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <SectionHeading icon={<Layers className="size-3.5" />} op="nlevel" sql="nlevel(path) = $1" />
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={1}
          max={maxDepth}
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
          aria-label="Generation depth"
          className="h-1.5 flex-1 cursor-pointer accent-[var(--search-foreground)]"
        />
        <Badge variant="secondary" className="w-8 justify-center tabular-nums">
          {depth}
        </Badge>
      </div>
      <Button size="sm" className="w-full" onClick={() => void run()} disabled={pending}>
        {pending ? "Highlighting…" : `Highlight generation ${depth}`}
      </Button>
      {count != null ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{count}</span> taxa at depth {depth}.
        </p>
      ) : null}
    </div>
  );
}

/** `subpath` / `subltree` — extract a window of one taxon's path. */
function SliceSection({
  allTaxa,
  onRecenter,
}: {
  allTaxa: TaxonRow[];
  onRecenter: (path: string) => void;
}) {
  const [path, setPath] = useState<string | null>(null);
  const [from, setFrom] = useState(2);
  const [to, setTo] = useState(5);
  const [subpathRes, setSubpathRes] = useState<string | null>(null);
  const [subltreeRes, setSubltreeRes] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = path != null && from < to;

  async function run() {
    if (!ready) return;
    setPending(true);
    setError(null);
    try {
      const [sp, sl] = await Promise.all([
        lineageSlice({ data: { path, from, to } }),
        lineageSubtree({ data: { path, start: from, end: to } }),
      ]);
      setSubpathRes(sp);
      setSubltreeRes(sl);
    } catch (e) {
      setSubpathRes(null);
      setSubltreeRes(null);
      setError(e instanceof Error ? e.message : "Out-of-range slice.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <SectionHeading
        icon={<Scissors className="size-3.5" />}
        op="subpath"
        sql="subpath(path, $1, $2)"
      />
      <Select
        value={path ?? undefined}
        onValueChange={(v) => {
          setPath(v);
          setSubpathRes(null);
          setSubltreeRes(null);
        }}
      >
        <SelectTrigger size="sm" className="w-full">
          <SelectValue placeholder="Choose a taxon…" />
        </SelectTrigger>
        <SelectContent>
          {allTaxa.map((t) => (
            <SelectItem key={t.path} value={t.path}>
              {t.scientificName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2 text-xs">
        <label className="flex items-center gap-1">
          from
          <OffsetInput value={from} onChange={setFrom} />
        </label>
        <label className="flex items-center gap-1">
          to
          <OffsetInput value={to} onChange={setTo} />
        </label>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => void run()}
          disabled={!ready || pending}
        >
          Slice
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {path && subpathRes != null ? (
        <SliceCrumbs
          label="subpath"
          full={path}
          slice={subpathRes}
          from={from}
          onRecenter={onRecenter}
        />
      ) : null}
      {path && subltreeRes != null ? (
        <SliceCrumbs
          label="subltree"
          full={path}
          slice={subltreeRes}
          from={from}
          onRecenter={onRecenter}
        />
      ) : null}
    </div>
  );
}

/**
 * Render a slice result as clickable crumbs. Crumb `i` of a window starting at
 * `from` is full-path label `from + i`, so its absolute prefix is
 * `labels[0 .. from + i]` — recentering targets the real ancestor node.
 */
function SliceCrumbs({
  label,
  full,
  slice,
  from,
  onRecenter,
}: {
  label: string;
  full: string;
  slice: string;
  from: number;
  onRecenter: (path: string) => void;
}) {
  const fullLabels = labels(full);
  const parts = slice ? slice.split(".") : [];
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs">
      <span className="font-mono text-[0.7rem] text-muted-foreground">{label}:</span>
      {parts.map((lbl, i) => {
        const abs = fullLabels.slice(0, from + i + 1).join(".");
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
  );
}

/**
 * `indexOf` — the 0-based position at which a sub-path occurs inside a taxon's
 * path (`-1` when absent). Picking the genus `Homo` inside *Homo sapiens*
 * returns 5; a sub-path from a divergent branch returns `-1` — the operator-true
 * signal that the two lineages never share that contiguous run of labels.
 */
function BranchPointSection({ allTaxa }: { allTaxa: TaxonRow[] }) {
  const [path, setPath] = useState<string | null>(null);
  const [needle, setNeedle] = useState("Homo");
  const [idx, setIdx] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  const ready = path != null && needle.trim().length > 0;

  async function run() {
    if (!ready) return;
    setPending(true);
    try {
      const result = await indexOfBranch({ data: { a: path, b: needle.trim() } });
      setIdx(result);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <SectionHeading icon={<GitFork className="size-3.5" />} op="indexOf" sql="index(path, $1)" />
      <TaxonSelect
        value={path}
        onChange={(v) => {
          setPath(v);
          setIdx(null);
        }}
        placeholder="Taxon (haystack)…"
        taxa={allTaxa}
      />
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={needle}
          onChange={(e) => setNeedle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void run();
          }}
          placeholder="sub-path, e.g. Homo"
          spellCheck={false}
          aria-label="Sub-path to locate"
          className="h-7 flex-1 rounded-md border bg-background px-2 font-mono text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <Button size="sm" variant="outline" onClick={() => void run()} disabled={!ready || pending}>
          Locate
        </Button>
      </div>
      {idx != null ? (
        idx < 0 ? (
          <p className="text-xs text-muted-foreground">
            <code className="font-mono">{needle.trim()}</code> is not a sub-path — divergent branch.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Found at label index <span className="font-semibold text-foreground">{idx}</span>.
          </p>
        )
      ) : null}
    </div>
  );
}

function SectionHeading({ icon, op, sql }: { icon: ReactNode; op: string; sql: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <Badge variant="secondary" className="font-mono text-[0.7rem]">
        {op}
      </Badge>
      <code className="font-mono text-[0.7rem] text-muted-foreground">{sql}</code>
    </div>
  );
}

function OffsetInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-7 w-12 rounded-md border bg-background px-1.5 text-center font-mono text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
    />
  );
}

function TaxonSelect({
  value,
  onChange,
  placeholder,
  taxa,
}: {
  value: string | null;
  onChange: (v: string) => void;
  placeholder: string;
  taxa: TaxonRow[];
}) {
  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {taxa.map((t) => (
          <SelectItem key={t.path} value={t.path}>
            {t.scientificName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
