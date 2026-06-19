import { CATALOG } from "@/analyzer";
import type { DrawbackStatus } from "@/analyzer";
import { catalogByCategory, STATUS_LABEL } from "@/lib/catalog-ui";
import { cn } from "@/lib/cn";

const STATUS_CLASS: Record<DrawbackStatus, string> = {
  supported: "bg-primary text-primary-foreground",
  partial: "bg-accent text-accent-foreground",
  unsupported: "bg-muted text-muted-foreground",
};

function Badge({ status }: { status: DrawbackStatus }) {
  return (
    <span
      className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", STATUS_CLASS[status])}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function CatalogPage() {
  const groups = catalogByCategory();
  return (
    <section data-testid="catalog">
      <div className="rounded-2xl border-2 border-border bg-card p-4">
        <h2 className="font-heading text-lg font-bold">Drawback catalog</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <span data-testid="catalog-count">{CATALOG.length}</span> drawbacks catalogued.
          Definitions are <strong>community-sourced and unofficial</strong>, compiled from public
          sources (see <code>docs/research/drawback-catalog-research.md</code>). The official
          Drawback Chess glossary is password-gated and is not used. Confidence reflects how well a
          definition is corroborated, not any official status.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          <strong>Supported</strong> = evaluated by the analyzer. <strong>Partial</strong> = known
          but not yet evaluated (e.g. lose-conditions). <strong>Unsupported</strong> = not inferable
          from move history (hidden-info or per-move random).
        </p>
      </div>

      <div className="mt-4 space-y-5">
        {groups.map((g) => (
          <div key={g.category}>
            <h3 className="font-heading text-sm font-bold tracking-wide text-foreground uppercase">
              {g.label} <span className="text-muted-foreground">({g.entries.length})</span>
            </h3>
            <ul className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              {g.entries.map((e) => (
                <li
                  key={e.id}
                  data-catalog-id={e.id}
                  data-status={e.status}
                  className="rounded-xl border-2 border-border bg-card p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{e.title}</span>
                    <Badge status={e.status} />
                    <span className="text-[11px] text-muted-foreground">
                      confidence: {e.confidence}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{e.description}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
