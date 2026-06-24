import { cn } from "~/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

/**
 * The showcase matrix as a live legend. Every ltree operator/function the viewer
 * can fire is listed with its method name and SQL lowering; the operator(s)
 * currently driving the canvas highlight (passed in `activeOps`) glow so it's
 * obvious which extension primitive each interaction lowered to.
 */

export type OperatorLegendProps = {
  /** Method names of the operators invoked by the latest action. */
  activeOps: ReadonlySet<string>;
};

type Entry = { op: string; sql: string };
type Group = { title: string; entries: Entry[] };

const GROUPS: Group[] = [
  {
    title: "Hierarchy",
    entries: [
      { op: "isAncestorOf", sql: "@>" },
      { op: "isDescendantOf", sql: "<@" },
      { op: "lca", sql: "lca(…)" },
    ],
  },
  {
    title: "Pattern match",
    entries: [
      { op: "matchesLquery", sql: "~" },
      { op: "matchesLqueryArray", sql: "?" },
      { op: "matchesLtxtquery", sql: "@" },
    ],
  },
  {
    title: "Depth & slices",
    entries: [
      { op: "nlevel", sql: "nlevel()" },
      { op: "subpath", sql: "subpath()" },
      { op: "subltree", sql: "subltree()" },
      { op: "indexOf", sql: "index()" },
    ],
  },
  {
    title: "Mutate",
    entries: [{ op: "concatText", sql: "|| text" }],
  },
];

export function OperatorLegend({ activeOps }: OperatorLegendProps) {
  return (
    <Card className="gap-2 py-3">
      <CardHeader className="px-3">
        <CardTitle className="text-sm">Operator matrix</CardTitle>
        <CardDescription className="text-xs">
          Every control lowers to one of these ltree primitives. Active ones glow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3">
        {GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.entries.map((e) => {
                const active = activeOps.has(e.op);
                return (
                  <li
                    key={e.op}
                    className={cn(
                      "flex items-center gap-2 rounded px-1.5 py-0.5 text-xs transition-colors",
                      active
                        ? "bg-search text-search-foreground ring-1 ring-[var(--search-foreground)]"
                        : "text-foreground/80",
                    )}
                  >
                    <span className={cn("font-medium", active && "font-semibold")}>{e.op}</span>
                    <code className="ml-auto font-mono text-[0.7rem] text-muted-foreground">
                      {e.sql}
                    </code>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
