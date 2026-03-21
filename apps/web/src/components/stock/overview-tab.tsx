import { useState } from "react";
import {
  Loader2,
  TrendingDown,
  TrendingUp,
  Users,
  Brain,
  ArrowRight,
} from "lucide-react";
import type { StockProfile } from "../../types";
import StatsGrid from "./stats-grid";
import InteractiveChart from "./interactive-chart";
import { formatMarketCap } from "../../lib/format";
import { cn } from "../../lib/cn";

function fmtPct(val: number | null | undefined): string {
  if (val == null) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

function fmtRatio(val: number | null | undefined, decimals = 1): string {
  if (val == null) return "—";
  return val.toFixed(decimals);
}

function fmtCurrency(val: number | null | undefined): string {
  if (val == null) return "—";
  return `$${val.toFixed(2)}`;
}

const RISK_COLORS: Record<string, string> = {
  Low: "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-rose-100 text-rose-700",
};

export default function OverviewTab({
  profile,
  onSectionChange,
}: {
  profile: StockProfile;
  onSectionChange?: (section: string) => void;
}) {
  const overview = profile.overview;
  const profileInfo = overview?.profile;
  const stats = overview?.statistics;
  const margins = overview?.margins;
  const valuation = overview?.valuation;
  const returns = overview?.returns;
  const growth = overview?.growth;
  const dividends = overview?.dividends;
  const health = overview?.financial_health;
  const research = profile.research;
  const aiAnalysis = research?.ai_analysis;

  const [showFullDesc, setShowFullDesc] = useState(false);

  return (
    <div className="space-y-4">
      {/* Company Overview */}
      {profileInfo && profileInfo.description && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Company Overview
          </h3>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {showFullDesc
              ? profileInfo.description
              : profileInfo.description.slice(0, 300)}
            {profileInfo.description.length > 300 && (
              <button
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="text-primary text-sm ml-1 hover:underline"
              >
                {showFullDesc ? "Show less" : "Show more"}
              </button>
            )}
          </p>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
            {profileInfo.ceo && (
              <span>
                CEO: <strong className="text-foreground">{profileInfo.ceo}</strong>
              </span>
            )}
            {profileInfo.website && (
              <a
                href={profileInfo.website.startsWith("http") ? profileInfo.website : `https://${profileInfo.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {profileInfo.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {profileInfo.employees && (
              <span>
                Employees:{" "}
                <strong className="text-foreground">
                  {profileInfo.employees.toLocaleString()}
                </strong>
              </span>
            )}
            {profileInfo.ipo_date && (
              <span>
                IPO: <strong className="text-foreground">{profileInfo.ipo_date}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* AI Summary (compact) */}
      {aiAnalysis && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              AI Investment Summary
            </h3>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium ml-auto",
                RISK_COLORS[aiAnalysis.risk_rating] || "bg-secondary text-muted-foreground",
              )}
            >
              {aiAnalysis.risk_rating} Risk
            </span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {aiAnalysis.investment_summary}
          </p>
          {onSectionChange && (
            <button
              onClick={() => onSectionChange("ai-analysis")}
              className="text-primary text-xs mt-2 hover:underline inline-flex items-center gap-1"
            >
              View full AI analysis <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Company Statistics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Market Cap" value={formatMarketCap(stats.market_cap)} />
            <StatCard
              label="Enterprise Value"
              value={formatMarketCap(stats.enterprise_value)}
            />
            <StatCard
              label="Shares Out"
              value={
                stats.shares_outstanding
                  ? `${(stats.shares_outstanding / 1e9).toFixed(2)}B`
                  : "—"
              }
            />
            <StatCard label="Beta" value={stats.beta?.toFixed(2) ?? "—"} />
          </div>
        </div>
      )}

      {/* Margins + Valuation row */}
      <div className="grid md:grid-cols-2 gap-4">
        {margins && (
          <StatsGrid
            title="Margins"
            items={[
              { label: "Gross", value: fmtPct(margins.gross) },
              { label: "EBITDA", value: fmtPct(margins.ebitda) },
              { label: "Operating", value: fmtPct(margins.operating) },
              { label: "Net", value: fmtPct(margins.net) },
              { label: "FCF", value: fmtPct(margins.fcf) },
            ]}
            explanations={aiAnalysis?.key_metrics_commentary}
          />
        )}
        {valuation && (
          <StatsGrid
            title="Valuation (TTM)"
            items={[
              { label: "P/E", value: fmtRatio(valuation.pe) },
              { label: "P/B", value: fmtRatio(valuation.pb) },
              { label: "EV/Sales", value: fmtRatio(valuation.ev_to_sales) },
              { label: "EV/EBITDA", value: fmtRatio(valuation.ev_to_ebitda) },
              { label: "P/FCF", value: fmtRatio(valuation.pfcf) },
            ]}
            explanations={aiAnalysis?.key_metrics_commentary}
          />
        )}
      </div>

      {/* Returns + Growth row */}
      <div className="grid md:grid-cols-2 gap-4">
        {returns && (
          <StatsGrid
            title="Returns"
            items={[
              { label: "ROA", value: fmtPct(returns.roa) },
              { label: "ROE", value: fmtPct(returns.roe) },
              { label: "ROIC", value: fmtPct(returns.roic) },
              { label: "ROCE", value: fmtPct(returns.roce) },
            ]}
          />
        )}
        {growth && (
          <StatsGrid
            title="Growth (CAGR)"
            items={[
              { label: "Rev 3Yr", value: fmtPct(growth.revenue_growth_3yr) },
              { label: "Rev 5Yr", value: fmtPct(growth.revenue_growth_5yr) },
              { label: "EPS 3Yr", value: fmtPct(growth.eps_growth_3yr) },
              { label: "EPS 5Yr", value: fmtPct(growth.eps_growth_5yr) },
            ]}
            explanations={aiAnalysis?.key_metrics_commentary}
          />
        )}
      </div>

      {/* Financial Health + Dividends row */}
      <div className="grid md:grid-cols-2 gap-4">
        {health && (
          <StatsGrid
            title="Financial Health"
            items={[
              {
                label: "Cash/Share",
                value: health.cash_per_share
                  ? fmtCurrency(health.cash_per_share)
                  : "—",
              },
              { label: "Debt/Equity", value: fmtRatio(health.debt_to_equity) },
              {
                label: "Interest Coverage",
                value: fmtRatio(health.interest_coverage),
              },
              { label: "Current Ratio", value: fmtRatio(health.current_ratio) },
            ]}
            explanations={aiAnalysis?.key_metrics_commentary}
          />
        )}
        {dividends && (
          <StatsGrid
            title="Dividends"
            items={[
              { label: "Yield", value: fmtPct(dividends.yield) },
              { label: "Payout Ratio", value: fmtPct(dividends.payout_ratio) },
              { label: "DPS", value: dividends.dps ? fmtCurrency(dividends.dps) : "—" },
              { label: "DPS Growth", value: fmtPct(dividends.dps_growth) },
            ]}
          />
        )}
      </div>

      {/* Price Chart */}
      {profile.price_history && profile.price_history.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Price Chart
          </h3>
          <InteractiveChart data={profile.price_history} compact />
        </div>
      )}

      {/* Revenue Segments */}
      {overview?.revenue_segments && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Revenue Breakdown
          </h3>
          <div className="space-y-2">
            {Object.entries(overview.revenue_segments).map(([segment, value]) => {
              const total = Object.values(overview.revenue_segments!).reduce(
                (a, b) => a + (b as number),
                0,
              );
              const pct = total > 0 ? ((value as number) / total) * 100 : 0;
              return (
                <div key={segment} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-44 truncate">
                    {segment}
                  </span>
                  <div className="flex-1 bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-14 text-right tabular-nums">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Research section */}
      {!profile.has_research ? (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Generating deep research...
              </p>
              <p className="text-xs text-muted-foreground">
                Fetching financials, earnings call analysis, insider data, and more. This will appear automatically.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Headwinds & Tailwinds from research */}
          {research?.headwinds_tailwinds && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Headwinds & Tailwinds
              </h3>
              {research.headwinds_tailwinds.transcript_date && (
                <p className="text-xs text-muted-foreground mb-2">
                  Based on Q{research.headwinds_tailwinds.transcript_quarter}{" "}
                  {research.headwinds_tailwinds.transcript_year} earnings call
                </p>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-rose-600 mb-2 flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" /> Headwinds
                  </h4>
                  <ul className="space-y-1.5">
                    {research.headwinds_tailwinds.headwinds.map((h, i) => (
                      <li
                        key={i}
                        className="text-sm text-foreground/80 pl-3 border-l-2 border-rose-300"
                      >
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-600 mb-2 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> Tailwinds
                  </h4>
                  <ul className="space-y-1.5">
                    {research.headwinds_tailwinds.tailwinds.map((t, i) => (
                      <li
                        key={i}
                        className="text-sm text-foreground/80 pl-3 border-l-2 border-emerald-300"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Management from research */}
          {research?.management && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Management
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                {research.management.ceo && (
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">CEO</p>
                    <p className="text-sm font-semibold text-foreground">
                      {research.management.ceo.name}
                    </p>
                  </div>
                )}
                {research.management.cfo && (
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">CFO</p>
                    <p className="text-sm font-semibold text-foreground">
                      {research.management.cfo.name}
                    </p>
                  </div>
                )}
              </div>
              {research.management.major_holders &&
                Object.keys(research.management.major_holders).length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(research.management.major_holders).map(
                      ([label, value]) => (
                        <div
                          key={label}
                          className="bg-secondary rounded-lg p-2 text-xs"
                        >
                          <span className="text-muted-foreground">{label}: </span>
                          <span className="font-semibold text-foreground">
                            {value}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}
            </div>
          )}

          {research?.last_refreshed && (
            <p className="text-xs text-muted-foreground text-center">
              Research generated{" "}
              {new Date(research.last_refreshed).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary rounded-lg p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}
