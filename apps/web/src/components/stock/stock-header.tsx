import { RefreshCw } from "lucide-react";
import type { StockProfile } from "../../types";

export default function StockHeader({
  profile,
  onRefresh,
  isRefreshing,
}: {
  profile: StockProfile;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const overview = profile.overview;
  const stats = overview?.statistics;
  const profileInfo = overview?.profile;

  const price = stats?.price ?? profile.share_price;
  const change = stats?.changes;
  const changePct = stats?.change_percentage ?? (price && change ? (change / (price - change)) * 100 : null);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {profile.ticker}
            </h1>
            <span className="text-lg text-muted-foreground">
              {profile.company}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {price != null && (
              <span className="text-2xl font-semibold text-foreground tabular-nums">
                ${price.toFixed(2)}
              </span>
            )}
            {change != null && changePct != null && (
              <span
                className={`text-sm font-medium ${change >= 0 ? "text-emerald-600" : "text-rose-600"}`}
              >
                {change >= 0 ? "+" : ""}
                {change.toFixed(2)} ({changePct >= 0 ? "+" : ""}
                {changePct.toFixed(2)}%)
              </span>
            )}
          </div>
          {profileInfo && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {profileInfo.sector && (
                <span className="text-xs bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                  {profileInfo.sector}
                </span>
              )}
              {profileInfo.industry && (
                <span className="text-xs bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                  {profileInfo.industry}
                </span>
              )}
              {profileInfo.exchange && (
                <span className="text-xs bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                  {profileInfo.exchange}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}
