import type { StockProfile } from "../../types";
import InteractiveChart from "./interactive-chart";

export default function ChartsSection({ profile }: { profile: StockProfile }) {
  if (!profile.price_history || profile.price_history.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground text-sm">
          No price history available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Price Chart
        </h3>
        <InteractiveChart data={profile.price_history} />
      </div>
    </div>
  );
}
