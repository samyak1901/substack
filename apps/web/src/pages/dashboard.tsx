import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  BookOpen,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Bell,
  FlaskConical,
} from "lucide-react";
import { fetchDashboard } from "../api/stock";
import type { DashboardMover } from "../api/stock";
import { formatPrice, formatMarketCap } from "../lib/format";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    staleTime: 60_000,
  });

  const handleSearch = () => {
    const q = searchInput.trim();
    if (q.length >= 1) {
      if (/^[A-Z]{1,10}$/.test(q.toUpperCase()) && q.length <= 6) {
        navigate(`/stock/${q.toUpperCase()}`);
      } else {
        navigate(`/search?q=${encodeURIComponent(q)}`);
      }
      setSearchInput("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Search */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for any stock (e.g. AAPL, MSFT)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-12 pr-4 py-3 rounded-xl text-sm bg-secondary border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Today's Digest */}
        {data?.latest_digest && (
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Today's Digest
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              {data.latest_digest.date} &middot;{" "}
              {data.latest_digest.article_count} articles
            </p>
            {data.latest_digest.overview && (
              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3 mb-3">
                {data.latest_digest.overview}
              </p>
            )}
            <Link
              to={`/digests/${data.latest_digest.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
            >
              Read Full Digest
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Recent Alerts */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Recent Alerts
              </h2>
            </div>
            <Link
              to="/watchlist?alerts=1"
              className="text-xs text-primary hover:text-primary/80"
            >
              View All
            </Link>
          </div>
          {data?.alerts && data.alerts.length > 0 ? (
            <div className="space-y-2">
              {data.alerts.map((alert) => (
                <Link
                  key={alert.id}
                  to={`/stock/${alert.ticker}`}
                  className="block text-sm text-foreground/80 hover:text-foreground transition-colors py-1"
                >
                  <span className="font-medium text-primary">
                    {alert.ticker}
                  </span>{" "}
                  {alert.message}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent alerts</p>
          )}
        </div>
      </div>

      {/* Watchlist Movers */}
      {data && (data.gainers.length > 0 || data.losers.length > 0) && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              Watchlist Movers
            </h2>
            <Link
              to="/watchlist"
              className="text-xs text-primary hover:text-primary/80"
            >
              View Watchlist ({data.watchlist_count})
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {data.gainers.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Top Gainers
                </h3>
                <div className="space-y-1">
                  {data.gainers.map((m) => (
                    <MoverRow key={m.ticker} mover={m} />
                  ))}
                </div>
              </div>
            )}
            {data.losers.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Top Losers
                </h3>
                <div className="space-y-1">
                  {data.losers.map((m) => (
                    <MoverRow key={m.ticker} mover={m} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recently Researched */}
      {data?.recent_research && data.recent_research.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Recently Researched
            </h2>
          </div>
          <div className="divide-y divide-border">
            {data.recent_research.map((item) => (
              <Link
                key={item.ticker}
                to={`/stock/${item.ticker}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-secondary/50 transition-colors"
              >
                <div>
                  <span className="font-semibold text-foreground text-sm">
                    {item.ticker}
                  </span>
                  <span className="text-muted-foreground ml-2 text-sm">
                    {item.company}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {item.share_price && <span>{formatPrice(item.share_price)}</span>}
                  {item.market_cap && <span>{formatMarketCap(item.market_cap)}</span>}
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MoverRow({ mover }: { mover: DashboardMover }) {
  const navigate = useNavigate();
  const pct = mover.price_change_pct;
  const isPositive = (pct ?? 0) >= 0;

  return (
    <button
      onClick={() => navigate(`/stock/${mover.ticker}`)}
      className="w-full flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary/50 transition-colors text-left"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          {mover.ticker}
        </span>
        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
          {mover.company}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {mover.current_price && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatPrice(mover.current_price)}
          </span>
        )}
        {pct != null && (
          <span
            className={`text-xs font-semibold tabular-nums ${isPositive ? "text-emerald-600" : "text-rose-600"}`}
          >
            {isPositive ? "+" : ""}
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
    </button>
  );
}
