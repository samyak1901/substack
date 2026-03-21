import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  Loader2,
  Search,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useResearch, useResearchList } from "../hooks/use-research";
import { useJobProgress } from "../hooks/use-job-progress";
import { refreshResearch } from "../api/research";
import { formatPrice, formatMarketCap, formatDate } from "../lib/format";
import PriceChart from "../components/research/price-chart";
import FinancialsTable from "../components/research/financials-table";
import type { StockResearch } from "../types";

export default function ResearchPage() {
  const { ticker: paramTicker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data: research, isLoading } = useResearch(paramTicker);
  const { data: researchList } = useResearchList();

  const progress = useJobProgress(activeJobId);

  const refreshMutation = useMutation({
    mutationFn: (ticker: string) => refreshResearch(ticker),
    onSuccess: (data) => {
      setActiveJobId(data.job_id);
    },
  });

  // When job completes, refetch research data
  const jobDone =
    progress?.status === "completed" || progress?.status === "failed";
  if (jobDone && activeJobId) {
    queryClient.invalidateQueries({ queryKey: ["research", paramTicker] });
    queryClient.invalidateQueries({ queryKey: ["research-list"] });
    setActiveJobId(null);
  }

  const handleSearch = useCallback(() => {
    const t = searchInput.trim().toUpperCase();
    if (t) {
      navigate(`/research/${t}`);
      setSearchInput("");
    }
  }, [searchInput, navigate]);

  const handleGenerate = useCallback(
    (ticker: string) => {
      refreshMutation.mutate(ticker);
    },
    [refreshMutation]
  );

  return (
    <div>
      {/* Header with search */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Stock Research
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deep-dive research template for any stock
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Enter ticker (e.g. AAPL)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 pr-4 py-2 rounded-lg text-sm bg-secondary border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Job progress bar */}
      {activeJobId && progress && !jobDone && (
        <div className="mb-6 bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">
              {progress.current_step || "Generating research..."}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress.progress_pct}%` }}
            />
          </div>
        </div>
      )}

      {/* No ticker selected — show recent research */}
      {!paramTicker && (
        <div className="space-y-4">
          {researchList && researchList.items.length > 0 ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  Recent Research
                </h2>
              </div>
              <div className="divide-y divide-border">
                {researchList.items.map((item) => (
                  <button
                    key={item.ticker}
                    onClick={() => navigate(`/research/${item.ticker}`)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div>
                      <span className="font-semibold text-foreground">
                        {item.ticker}
                      </span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        {item.company}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {item.share_price && (
                        <span>{formatPrice(item.share_price)}</span>
                      )}
                      {item.market_cap && (
                        <span>{formatMarketCap(item.market_cap)}</span>
                      )}
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-16 text-center">
              <Search className="w-10 h-10 mx-auto text-muted-foreground/30" />
              <p className="text-foreground text-lg font-medium mt-4">
                Search for a stock
              </p>
              <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
                Enter a ticker symbol above to generate a comprehensive research
                template.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Ticker selected but no data yet */}
      {paramTicker && !research && !isLoading && (
        <div className="bg-card rounded-xl border border-border p-16 text-center">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <p className="text-foreground text-lg font-medium mt-4">
            No research data for {paramTicker}
          </p>
          <p className="text-muted-foreground text-sm mt-2 mb-4">
            Generate a research template to get started.
          </p>
          <button
            onClick={() => handleGenerate(paramTicker)}
            disabled={refreshMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {refreshMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Generate Research
          </button>
        </div>
      )}

      {/* Loading */}
      {paramTicker && isLoading && (
        <div className="p-16 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Loading research...
          </p>
        </div>
      )}

      {/* Research template */}
      {research && <ResearchTemplate research={research} onRefresh={handleGenerate} isRefreshing={refreshMutation.isPending} />}
    </div>
  );
}

function ResearchTemplate({
  research,
  onRefresh,
  isRefreshing,
}: {
  research: StockResearch;
  onRefresh: (ticker: string) => void;
  isRefreshing: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">
                {research.ticker}
              </h2>
              <span className="text-lg text-muted-foreground">
                {research.company}
              </span>
            </div>
            {research.auditor && (
              <p className="text-xs text-muted-foreground mt-1">
                Auditor: {research.auditor}
              </p>
            )}
          </div>
          <button
            onClick={() => onRefresh(research.ticker)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <MetricCard label="Share Price" value={formatPrice(research.share_price)} />
          <MetricCard label="Market Cap" value={formatMarketCap(research.market_cap)} />
          <MetricCard
            label="Enterprise Value"
            value={formatMarketCap(research.enterprise_value)}
          />
          <MetricCard
            label="LEAP Dates"
            value={
              research.options_data?.leap_dates?.length
                ? `${research.options_data.leap_dates.length} available`
                : "N/A"
            }
          />
        </div>

        {research.options_data?.leap_dates && research.options_data.leap_dates.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {research.options_data.leap_dates.map((d) => (
              <span key={d} className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground">
                {d}
              </span>
            ))}
          </div>
        )}

        {research.last_refreshed && (
          <p className="text-xs text-muted-foreground mt-3">
            Last refreshed: {formatDate(research.last_refreshed)}
          </p>
        )}
      </div>

      {/* Financials */}
      {research.financials?.years && research.financials.years.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Summary Financials (5 Year)
          </h3>
          <FinancialsTable years={research.financials.years} />
        </div>
      )}

      {/* Price Chart */}
      {research.price_history && research.price_history.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Price Chart (2 Year)
          </h3>
          <PriceChart data={research.price_history} />
        </div>
      )}

      {/* Business Overview */}
      {research.business_overview && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Business Overview
          </h3>
          <p className="text-sm text-foreground/80 leading-relaxed mb-4">
            {research.business_overview.summary || "No summary available."}
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            {research.business_overview.sector && (
              <span className="bg-secondary px-3 py-1 rounded-lg text-muted-foreground">
                Sector: <strong className="text-foreground">{research.business_overview.sector}</strong>
              </span>
            )}
            {research.business_overview.industry && (
              <span className="bg-secondary px-3 py-1 rounded-lg text-muted-foreground">
                Industry: <strong className="text-foreground">{research.business_overview.industry}</strong>
              </span>
            )}
            {research.business_overview.employees && (
              <span className="bg-secondary px-3 py-1 rounded-lg text-muted-foreground">
                Employees: <strong className="text-foreground">{research.business_overview.employees.toLocaleString()}</strong>
              </span>
            )}
          </div>

          {/* Revenue segments */}
          {research.business_overview.revenue_segments && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Revenue Breakdown by Segment
              </h4>
              <div className="space-y-2">
                {Object.entries(research.business_overview.revenue_segments).map(
                  ([segment, value]) => {
                    const total = Object.values(
                      research.business_overview!.revenue_segments!
                    ).reduce((a, b) => a + (b as number), 0);
                    const pct = total > 0 ? ((value as number) / total) * 100 : 0;
                    return (
                      <div key={segment} className="flex items-center gap-3">
                        <span className="text-sm text-foreground w-40 truncate">
                          {segment}
                        </span>
                        <div className="flex-1 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-16 text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Headwinds & Tailwinds */}
      {research.headwinds_tailwinds && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Headwinds & Tailwinds
          </h3>
          {research.headwinds_tailwinds.transcript_date && (
            <p className="text-xs text-muted-foreground mb-3">
              Based on Q{research.headwinds_tailwinds.transcript_quarter}{" "}
              {research.headwinds_tailwinds.transcript_year} earnings call
            </p>
          )}
          {research.headwinds_tailwinds.recent_catalysts && (
            <p className="text-sm text-foreground/80 mb-4 italic">
              {research.headwinds_tailwinds.recent_catalysts}
            </p>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-rose-600 mb-2 flex items-center gap-1">
                <TrendingDown className="w-4 h-4" /> Headwinds
              </h4>
              <ul className="space-y-2">
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
              <ul className="space-y-2">
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

      {/* Management */}
      {research.management && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Management Overview
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {research.management.ceo && (
              <div className="bg-secondary rounded-lg p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  CEO
                </p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {research.management.ceo.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {research.management.ceo.title}
                </p>
              </div>
            )}
            {research.management.cfo && (
              <div className="bg-secondary rounded-lg p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  CFO
                </p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {research.management.cfo.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {research.management.cfo.title}
                </p>
              </div>
            )}
          </div>

          {/* Major Holders */}
          {research.management.major_holders &&
            Object.keys(research.management.major_holders).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Ownership Breakdown
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(research.management.major_holders).map(
                    ([label, value]) => (
                      <div
                        key={label}
                        className="bg-secondary rounded-lg p-3 text-sm"
                      >
                        <span className="text-muted-foreground">{label}: </span>
                        <span className="font-semibold text-foreground">
                          {value}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Insider Activity */}
      {research.insider_activity && research.insider_activity.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Recent Insider Activity
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">
                    Insider
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">
                    Transaction
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">
                    Shares
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {research.insider_activity.map((tx, i) => (
                  <tr key={i}>
                    <td className="py-2 text-foreground">
                      {tx.insider}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({tx.relation})
                      </span>
                    </td>
                    <td className="py-2">
                      <span
                        className={
                          tx.transaction.toLowerCase().includes("buy") ||
                          tx.transaction.toLowerCase().includes("purchase")
                            ? "text-emerald-600"
                            : tx.transaction.toLowerCase().includes("sale") ||
                                tx.transaction.toLowerCase().includes("sell")
                              ? "text-rose-600"
                              : "text-foreground"
                        }
                      >
                        {tx.transaction}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">{tx.date}</td>
                    <td className="py-2 text-right text-foreground">
                      {tx.shares}
                    </td>
                    <td className="py-2 text-right text-foreground">
                      {tx.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Superinvestors */}
      {research.superinvestors && research.superinvestors.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Superinvestor Ownership (Dataroma)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">
                    Manager
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">
                    % of Portfolio
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">
                    Activity
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">
                    Reported Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {research.superinvestors.map((si, i) => (
                  <tr key={i}>
                    <td className="py-2 font-medium text-foreground">
                      {si.manager}
                    </td>
                    <td className="py-2 text-foreground">
                      {si.pct_of_portfolio}
                    </td>
                    <td className="py-2">
                      <span
                        className={
                          si.activity.toLowerCase().includes("buy") ||
                          si.activity.toLowerCase().includes("add")
                            ? "text-emerald-600"
                            : si.activity.toLowerCase().includes("sell") ||
                                si.activity.toLowerCase().includes("reduce")
                              ? "text-rose-600"
                              : "text-muted-foreground"
                        }
                      >
                        {si.activity || "—"}
                      </span>
                    </td>
                    <td className="py-2 text-right text-foreground">
                      {si.reported_price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary rounded-lg p-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
