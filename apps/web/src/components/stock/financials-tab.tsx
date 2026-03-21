import type { StockProfile } from "../../types";
import FinancialsTable from "../research/financials-table";
import PriceChart from "../research/price-chart";

export default function FinancialsTab({ profile }: { profile: StockProfile }) {
  // Prefer deep research financials, fall back to overview financials from FMP
  const financials =
    profile.research?.financials ?? profile.overview?.financials ?? null;

  if (!financials?.years?.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground text-sm">
          No financial data available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Summary Financials (5 Year)
        </h3>
        <FinancialsTable years={financials.years} />
      </div>

      {profile.price_history && profile.price_history.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Price Chart (2 Year)
          </h3>
          <PriceChart data={profile.price_history} />
        </div>
      )}
    </div>
  );
}
