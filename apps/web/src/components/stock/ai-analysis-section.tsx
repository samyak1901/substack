import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { StockProfile, AIAnalysis } from "../../types";
import { useAIAnalysis, useGenerateAIAnalysis } from "../../hooks/use-stock";
import { cn } from "../../lib/cn";

const riskBadgeClasses: Record<AIAnalysis["risk_rating"], string> = {
  Low: "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-rose-100 text-rose-700",
};

export default function AIAnalysisSection({
  ticker,
  profile,
}: {
  ticker: string;
  profile: StockProfile;
}) {
  const { data } = useAIAnalysis(ticker);
  const generateMutation = useGenerateAIAnalysis();

  const analysis: AIAnalysis | null =
    data?.ai_analysis ?? profile.research?.ai_analysis ?? null;

  const handleGenerate = () => {
    generateMutation.mutate(ticker);
  };

  if (!analysis) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Generating AI Analysis
        </h3>
        <p className="text-sm text-muted-foreground">
          Analyzing {ticker} financials, valuation, and growth profile. This will appear automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Investment Summary */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Investment Summary
          </h3>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              riskBadgeClasses[analysis.risk_rating]
            )}
          >
            {analysis.risk_rating} Risk
          </span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {analysis.investment_summary}
        </p>
      </div>

      {/* Bull Case / Bear Case */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bull Case */}
        <div className="bg-card rounded-xl border border-emerald-500/30 p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Bull Case
          </h3>
          <ul className="space-y-2">
            {analysis.bull_case.map((point, i) => (
              <li
                key={i}
                className="text-sm text-foreground/80 flex items-start gap-2"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Bear Case */}
        <div className="bg-card rounded-xl border border-rose-500/30 p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-rose-500" />
            Bear Case
          </h3>
          <ul className="space-y-2">
            {analysis.bear_case.map((point, i) => (
              <li
                key={i}
                className="text-sm text-foreground/80 flex items-start gap-2"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Risk Factors */}
      {analysis.risk_factors.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Risk Factors
          </h3>
          <ul className="space-y-2">
            {analysis.risk_factors.map((factor, i) => (
              <li
                key={i}
                className="text-sm text-foreground/80 flex items-start gap-2"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Metrics Commentary */}
      {Object.keys(analysis.key_metrics_commentary).length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Key Metrics Commentary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(analysis.key_metrics_commentary).map(
              ([metric, commentary]) => (
                <div key={metric}>
                  <p className="text-xs font-semibold text-foreground mb-0.5">
                    {metric}
                  </p>
                  <p className="text-sm text-muted-foreground">{commentary}</p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Regenerate button */}
      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 disabled:opacity-50 transition-colors"
        >
          {generateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Regenerate Analysis
        </button>
      </div>
    </div>
  );
}
