import { Link } from "react-router-dom";
import type { DigestSummary } from "../../types";
import { cn } from "../../lib/cn";

export default function DigestArchive({
  digests,
  currentId,
}: {
  digests: DigestSummary[];
  currentId?: number;
}) {
  if (digests.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Archive
      </h3>
      <ul className="space-y-0.5">
        {digests.map((d) => (
          <li key={d.id}>
            <Link
              to={`/digests/${d.id}`}
              className={cn(
                "block px-3 py-2 rounded-lg text-sm transition-colors",
                d.id === currentId
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <span>{d.date}</span>
              <span className="text-muted-foreground/60 ml-2 text-xs">
                {d.article_count} article{d.article_count !== 1 ? "s" : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
