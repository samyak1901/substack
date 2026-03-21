import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useStockProfile } from "../hooks/use-stock";
import StockLayout from "../components/stock/stock-layout";
import OverviewTab from "../components/stock/overview-tab";
import FinancialsSection from "../components/stock/financials-section";
import ArticlesTab from "../components/stock/articles-tab";
import InsidersTab from "../components/stock/insiders-tab";
import ChartsSection from "../components/stock/charts-section";
import ValuationSection from "../components/stock/valuation-section";
import AIAnalysisSection from "../components/stock/ai-analysis-section";
import { cn } from "../lib/cn";

type Section =
  | "overview"
  | "financials"
  | "valuation"
  | "charts"
  | "articles"
  | "insiders"
  | "ai-analysis";

const MOBILE_SECTIONS: { key: Section; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "financials", label: "Financials" },
  { key: "valuation", label: "Valuation" },
  { key: "charts", label: "Charts" },
  { key: "articles", label: "Articles" },
  { key: "insiders", label: "Insiders" },
  { key: "ai-analysis", label: "AI" },
];

export default function StockPage() {
  const { ticker: paramTicker } = useParams<{ ticker: string }>();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const ticker = paramTicker?.toUpperCase();
  const { data: profile, isLoading, error } = useStockProfile(ticker);

  // Auto-refetch when research/AI analysis are still generating in the background
  // Poll every 10s until research and AI analysis are both populated
  const needsRefetch =
    profile &&
    (!profile.has_research || !profile.research?.ai_analysis);

  useEffect(() => {
    if (!needsRefetch || !ticker) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["stock-profile", ticker] });
      queryClient.invalidateQueries({ queryKey: ["ai-analysis", ticker] });
    }, 10_000);
    return () => clearInterval(interval);
  }, [needsRefetch, ticker, queryClient]);

  // No ticker
  if (!ticker) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-card rounded-xl border border-border p-16 text-center">
          <Search className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <p className="text-foreground text-lg font-medium mt-4">
            Search for a stock
          </p>
          <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
            Use the search bar in the header to find a stock by ticker or name.
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="p-16 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">
          Loading {ticker}...
        </p>
      </div>
    );
  }

  // Error
  if (error && !isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-foreground font-medium">
            Could not load data for {ticker}
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Please check the ticker symbol and try again.
          </p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <>
      {/* Mobile section nav */}
      <div className="lg:hidden overflow-x-auto border-b border-border bg-card">
        <div className="flex gap-1 px-4 py-2">
          {MOBILE_SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                activeSection === s.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <StockLayout
        profile={profile}
        activeSection={activeSection}
        onSectionChange={(s) => setActiveSection(s as Section)}
      >
        {activeSection === "overview" && (
          <OverviewTab
            profile={profile}
            onSectionChange={(s) => setActiveSection(s as Section)}
          />
        )}
        {activeSection === "financials" && (
          <FinancialsSection profile={profile} />
        )}
        {activeSection === "valuation" && (
          <ValuationSection profile={profile} />
        )}
        {activeSection === "charts" && <ChartsSection profile={profile} />}
        {activeSection === "articles" && (
          <ArticlesTab ticker={profile.ticker} />
        )}
        {activeSection === "insiders" && <InsidersTab profile={profile} />}
        {activeSection === "ai-analysis" && (
          <AIAnalysisSection ticker={profile.ticker} profile={profile} />
        )}
      </StockLayout>
    </>
  );
}
