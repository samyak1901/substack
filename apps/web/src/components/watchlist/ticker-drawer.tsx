import { useEffect } from "react";
import { Link } from "react-router-dom";
import { X, ExternalLink, FlaskConical } from "lucide-react";
import type { WatchlistEntry } from "../../types";
import { formatPrice, formatDate, formatMarketCap } from "../../lib/format";
import ConvictionBadge from "./conviction-badge";
import PriceChange from "./price-change";

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-secondary rounded-lg p-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="mt-1 text-sm font-semibold text-foreground">{children}</div>
    </div>
  );
}

export default function TickerDrawer({
  entry,
  onClose,
}: {
  entry: WatchlistEntry | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (entry) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [entry, onClose]);

  if (!entry) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed top-0 right-0 h-full w-full sm:max-w-md bg-card shadow-xl z-50 overflow-y-auto border-l border-border">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">{entry.ticker}</h2>
              <p className="text-sm text-muted-foreground">{entry.company}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <InfoBlock label="Conviction">
              <ConvictionBadge value={entry.conviction} />
            </InfoBlock>
            <InfoBlock label="Target Price">{formatPrice(entry.target_price)}</InfoBlock>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <InfoBlock label="Entry Price">{formatPrice(entry.price_at_mention)}</InfoBlock>
            <InfoBlock label="Current Price">
              <div className="flex items-center gap-2">
                {formatPrice(entry.current_price)}
                <PriceChange pct={entry.price_change_pct} />
              </div>
            </InfoBlock>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <InfoBlock label="Sector">{entry.sector || "N/A"}</InfoBlock>
            <InfoBlock label="Market Cap">{formatMarketCap(entry.market_cap)}</InfoBlock>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Reasoning
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {entry.reasoning || "No reasoning provided."}
            </p>
          </div>

          {entry.notes && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Notes
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed">{entry.notes}</p>
            </div>
          )}

          <div className="mb-6">
            <Link
              to={`/stock/${entry.ticker}`}
              onClick={onClose}
              className="inline-flex items-center gap-2 w-full px-4 py-3 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <FlaskConical className="w-4 h-4" />
              View Stock Profile
            </Link>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Article
            </h3>
            <div className="bg-secondary rounded-lg p-4 space-y-2">
              {entry.article_url ? (
                <a
                  href={entry.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {entry.article_title || "View Article"}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {entry.article_title || "No article"}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{entry.publication}</span>
                {entry.author && (
                  <>
                    <span>&middot;</span>
                    <span>{entry.author}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(entry.mention_date)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
