import {
  Building2,
  TrendingUp,
  BarChart3,
  LineChart,
  Newspaper,
  Users,
  Brain,
  Plus,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { formatMarketCap } from "../../lib/format";
import type { StockProfile } from "../../types";
import { useAddToWatchlist, useRemoveFromWatchlist } from "../../hooks/use-stock";

type Section =
  | "overview"
  | "financials"
  | "valuation"
  | "charts"
  | "articles"
  | "insiders"
  | "ai-analysis";

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Building2 className="w-4 h-4" /> },
  { id: "financials", label: "Financials", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "valuation", label: "Valuation", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "charts", label: "Charts", icon: <LineChart className="w-4 h-4" /> },
  { id: "articles", label: "Articles", icon: <Newspaper className="w-4 h-4" /> },
  { id: "insiders", label: "Insiders", icon: <Users className="w-4 h-4" /> },
  { id: "ai-analysis", label: "AI Analysis", icon: <Brain className="w-4 h-4" /> },
];

function formatStatValue(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "N/A";
  return `${value.toFixed(2)}${suffix}`;
}

export default function StockSidebar({
  profile,
  activeSection,
  onSectionChange,
}: {
  profile: StockProfile;
  activeSection: string;
  onSectionChange: (section: string) => void;
}) {
  const overview = profile.overview;
  const stats = overview?.statistics;
  const valuation = overview?.valuation;
  const profileInfo = overview?.profile;

  const price = stats?.price ?? profile.share_price;
  const change = stats?.changes;
  const changePct = stats?.change_percentage ?? (price && change ? (change / (price - change)) * 100 : null);
  const isPositive = (change ?? 0) >= 0;

  const onWatchlist = profile.watchlist?.on_watchlist ?? false;
  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();
  const isPending = addMutation.isPending || removeMutation.isPending;

  const handleToggleWatchlist = () => {
    if (onWatchlist) {
      removeMutation.mutate(profile.ticker);
    } else {
      addMutation.mutate({
        ticker: profile.ticker,
        company: profile.company,
      });
    }
  };

  return (
    <aside className="hidden lg:flex flex-col w-[280px] shrink-0 bg-card border-r border-border sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
      {/* Company Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          {profileInfo?.image ? (
            <img
              src={profileInfo.image}
              alt={profile.company}
              className="w-10 h-10 rounded-lg object-contain bg-secondary"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              {profile.ticker}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile.company}
            </p>
          </div>
        </div>
      </div>

      {/* Price Block */}
      <div className="p-4 border-b border-border">
        {price != null ? (
          <>
            <p className="text-xl font-semibold text-foreground tabular-nums">
              ${price.toFixed(2)}
            </p>
            {change != null && changePct != null && (
              <p
                className={cn(
                  "text-sm font-medium tabular-nums",
                  isPositive ? "text-emerald-600" : "text-rose-600"
                )}
              >
                {isPositive ? "+" : ""}
                {change.toFixed(2)} ({isPositive ? "+" : ""}
                {changePct.toFixed(2)}%)
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Price unavailable</p>
        )}
      </div>

      {/* Key Stats */}
      <div className="p-4 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Key Stats
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <StatItem
            label="Market Cap"
            value={formatMarketCap(stats?.market_cap ?? profile.market_cap)}
          />
          <StatItem
            label="P/E"
            value={formatStatValue(valuation?.pe, "x")}
          />
          <StatItem
            label="EV/EBITDA"
            value={formatStatValue(valuation?.ev_to_ebitda, "x")}
          />
          <StatItem
            label="Div Yield"
            value={
              valuation?.dividend_yield != null
                ? `${(valuation.dividend_yield * 100).toFixed(2)}%`
                : "N/A"
            }
          />
          <StatItem
            label="Beta"
            value={formatStatValue(stats?.beta)}
          />
          <StatItem
            label="52-wk Range"
            value={stats?.range ?? "N/A"}
            wide
          />
        </div>
      </div>

      {/* Section Nav */}
      <nav className="flex-1 p-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeSection === item.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Watchlist Button */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleToggleWatchlist}
          disabled={isPending}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40",
            onWatchlist
              ? "bg-secondary text-emerald-600 hover:bg-secondary/80"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : onWatchlist ? (
            <Check className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {onWatchlist ? "On Watchlist" : "Add to Watchlist"}
        </button>
      </div>
    </aside>
  );
}

function StatItem({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xs font-medium text-foreground truncate">{value}</p>
    </div>
  );
}
