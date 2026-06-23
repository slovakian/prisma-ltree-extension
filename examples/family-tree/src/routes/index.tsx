import { createFileRoute } from "@tanstack/react-router";
import { TreeCanvas } from "~/components/TreeCanvas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getTaxa } from "~/server/taxonomy";

/**
 * Root view: Tree-of-Life interactive viewer (Phase 3 — static canvas).
 *
 * The loader streams every taxon (path asc) from the `getTaxa` server function
 * — a real ltree query, no client-side tree assembly. `<TreeCanvas>` lays the
 * paths out as a horizontal dendrogram with React Flow. The controls column is
 * a deliberate skeleton: the operator-showcase controls (lineage, MRCA,
 * search, slices, graft) land in Phases 4–6 and slot into these placeholders.
 */
export const Route = createFileRoute("/")({
  loader: () => getTaxa(),
  component: Home,
});

const PLACEHOLDER_CONTROLS = [
  { title: "Selection", desc: "Click a taxon to inspect its lineage, subtree, and slices." },
  { title: "Common ancestor", desc: "MRCA finder via lca() — arrives in Phase 4." },
  { title: "Search", desc: "lquery / ltxtquery / generation — arrives in Phase 5." },
  { title: "Graft a taxon", desc: "concatText insert demo — arrives in Phase 6." },
] as const;

function Home() {
  const taxa = Route.useLoaderData();

  return (
    <main className="flex h-dvh flex-col bg-background">
      <header className="shrink-0 border-b px-6 py-3">
        <h1 className="text-lg font-bold tracking-tight">
          prisma-ltree · <span className="text-primary">Tree of Life</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          A pannable phylogeny rooted at <em>Catarrhini</em> — every control maps to a real{" "}
          <code>ltree</code> query. {taxa.length} taxa.
        </p>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="relative min-w-0 flex-1">
          <TreeCanvas taxa={taxa} />
        </section>

        <aside className="hidden w-80 shrink-0 space-y-3 overflow-y-auto border-l bg-sidebar p-4 lg:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Operator showcase
          </p>
          {PLACEHOLDER_CONTROLS.map((c) => (
            <Card key={c.title} className="gap-2 py-3">
              <CardHeader className="px-3">
                <CardTitle className="text-sm">{c.title}</CardTitle>
                <CardDescription className="text-xs">{c.desc}</CardDescription>
              </CardHeader>
              <CardContent className="px-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 font-mono">
                  coming soon
                </span>
              </CardContent>
            </Card>
          ))}
        </aside>
      </div>
    </main>
  );
}
