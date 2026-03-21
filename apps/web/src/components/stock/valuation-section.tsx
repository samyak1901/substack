import { useMemo, useState } from "react";
import { Calculator, Target, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { StockProfile, AnalystEstimate } from "../../types";
import { cn } from "../../lib/cn";

function fmtRatio(val: number | null | undefined, decimals = 1): string {
  if (val == null) return "\u2014";
  return val.toFixed(decimals);
}

function fmtNum(val: number | null | undefined): string {
  if (val == null) return "\u2014";
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toLocaleString()}`;
}

export default function ValuationSection({ profile }: { profile: StockProfile }) {
  const overview = profile.overview;
  const valuation = overview?.valuation;
  const statistics = overview?.statistics;
  const analystEstimates = overview?.analyst_estimates;
  const financials = useMemo(
    () => overview?.financials?.years ?? profile.research?.financials?.years ?? [],
    [overview?.financials?.years, profile.research?.financials?.years],
  );

  // --- DCF state ---
  const [growthRate, setGrowthRate] = useState(10);
  const [discountRate, setDiscountRate] = useState(10);
  const [terminalMultiple, setTerminalMultiple] = useState(15);

  // Get the most recent year's FCF
  const sortedFinancials = useMemo(() => {
    return [...financials].sort((a, b) => b.year.localeCompare(a.year));
  }, [financials]);

  const latestFcf = sortedFinancials.length > 0 ? sortedFinancials[0].fcf : null;
  const sharesOutstanding = statistics?.shares_outstanding ?? null;

  // Compute DCF fair value
  const fairValue = useMemo(() => {
    if (latestFcf == null || !sharesOutstanding || sharesOutstanding <= 0) return null;
    const g = growthRate / 100;
    const d = discountRate / 100;
    if (d === 0) return null;

    let totalPV = 0;
    let projectedFcf = latestFcf;

    for (let i = 1; i <= 5; i++) {
      projectedFcf = projectedFcf * (1 + g);
      totalPV += projectedFcf / Math.pow(1 + d, i);
    }

    const terminalValue = projectedFcf * terminalMultiple;
    const pvTerminal = terminalValue / Math.pow(1 + d, 5);

    return (totalPV + pvTerminal) / sharesOutstanding;
  }, [latestFcf, sharesOutstanding, growthRate, discountRate, terminalMultiple]);

  // Historical P/E data from financials
  const peData = useMemo(() => {
    return financials
      .filter((y) => y.eps != null && y.eps !== 0)
      .sort((a, b) => a.year.localeCompare(b.year))
      .map((y) => {
        const price = profile.share_price;
        // We only have current price; for a rough historical P/E we use EPS
        // In practice, we compute trailing P/E as current price / EPS for each year
        // This is an approximation since we don't have historical prices per year
        return {
          year: y.year,
          pe: price != null && y.eps != null && y.eps !== 0
            ? parseFloat((price / y.eps).toFixed(1))
            : null,
        };
      })
      .filter((d) => d.pe != null && d.pe > 0);
  }, [financials, profile.share_price]);

  return (
    <div className="space-y-4">
      {/* Current Multiples */}
      {valuation && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Current Multiples
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MultiplesCard label="P/E" value={fmtRatio(valuation.pe)} />
            <MultiplesCard label="P/B" value={fmtRatio(valuation.pb)} />
            <MultiplesCard label="P/S" value={fmtRatio(valuation.ps)} />
            <MultiplesCard label="P/FCF" value={fmtRatio(valuation.pfcf)} />
            <MultiplesCard label="EV/Sales" value={fmtRatio(valuation.ev_to_sales)} />
            <MultiplesCard label="EV/EBITDA" value={fmtRatio(valuation.ev_to_ebitda)} />
          </div>
        </div>
      )}

      {/* Analyst Targets */}
      {analystEstimates && analystEstimates.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" /> Analyst Targets
          </h3>
          <div className="space-y-3">
            {analystEstimates.map((est: AnalystEstimate) => (
              <div
                key={est.year}
                className="bg-secondary rounded-lg p-3 flex flex-wrap items-center gap-x-6 gap-y-2"
              >
                <span className="text-sm font-semibold text-foreground">
                  {est.year}
                </span>
                {est.estimated_eps != null && (
                  <span className="text-sm text-muted-foreground">
                    Forward EPS:{" "}
                    <strong className="text-foreground">
                      ${est.estimated_eps.toFixed(2)}
                    </strong>
                  </span>
                )}
                {est.estimated_revenue != null && (
                  <span className="text-sm text-muted-foreground">
                    Revenue Est:{" "}
                    <strong className="text-foreground">
                      {fmtNum(est.estimated_revenue)}
                    </strong>
                  </span>
                )}
                {(est.num_analysts_eps != null || est.num_analysts_revenue != null) && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {est.num_analysts_eps ?? est.num_analysts_revenue} analyst
                    {(est.num_analysts_eps ?? est.num_analysts_revenue ?? 0) !== 1
                      ? "s"
                      : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simple DCF Calculator */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Calculator className="w-4 h-4" /> Simple DCF Calculator
        </h3>

        {latestFcf != null && sharesOutstanding ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Growth Rate (%)
                </label>
                <input
                  type="number"
                  value={growthRate}
                  onChange={(e) => setGrowthRate(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Discount Rate (%)
                </label>
                <input
                  type="number"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Terminal Multiple (x)
                </label>
                <input
                  type="number"
                  value={terminalMultiple}
                  onChange={(e) => setTerminalMultiple(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-4">
              <span>
                Current FCF:{" "}
                <strong className="text-foreground">{fmtNum(latestFcf)}</strong>
              </span>
              <span>
                Shares Outstanding:{" "}
                <strong className="text-foreground">
                  {(sharesOutstanding / 1e9).toFixed(2)}B
                </strong>
              </span>
            </div>

            {fairValue != null && (
              <div
                className={cn(
                  "rounded-lg p-4 text-center",
                  profile.share_price != null && fairValue > profile.share_price
                    ? "bg-emerald-500/10 border border-emerald-500/30"
                    : "bg-rose-500/10 border border-rose-500/30",
                )}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  Estimated Fair Value Per Share
                </p>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  ${fairValue.toFixed(2)}
                </p>
                {profile.share_price != null && (
                  <p
                    className={cn(
                      "text-sm font-medium mt-1",
                      fairValue > profile.share_price
                        ? "text-emerald-600"
                        : "text-rose-600",
                    )}
                  >
                    {fairValue > profile.share_price ? "Undervalued" : "Overvalued"} by{" "}
                    {Math.abs(
                      ((fairValue - profile.share_price) / profile.share_price) * 100,
                    ).toFixed(1)}
                    % vs current price (${profile.share_price.toFixed(2)})
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Insufficient data to run DCF model. FCF or shares outstanding data is
            unavailable.
          </p>
        )}
      </div>

      {/* Historical P/E Chart */}
      {peData.length >= 2 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Historical P/E
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={peData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                  tickFormatter={(v: number) => `${v}x`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                  formatter={(value) => [`${Number(value)}x`, "P/E"]}
                />
                <Line
                  type="monotone"
                  dataKey="pe"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function MultiplesCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary rounded-lg p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}
