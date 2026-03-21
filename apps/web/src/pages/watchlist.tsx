import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Loader2, Star, Bell, Check } from "lucide-react";
import { useWatchlist } from "../hooks/use-watchlist";
import { refreshPrices, fetchAlerts, markAlertsRead } from "../api/watchlist";
import WatchlistTable from "../components/watchlist/watchlist-table";
import { formatDate } from "../lib/format";
import { cn } from "../lib/cn";
import type { WatchlistEntry } from "../types";

type Tab = "watchlist" | "alerts";

export default function WatchlistPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState("mention_date");
  const [order, setOrder] = useState("desc");
  const [activeTab, setActiveTab] = useState<Tab>(
    searchParams.get("alerts") === "1" ? "alerts" : "watchlist",
  );
  const [sectorFilter, setSectorFilter] = useState("all");
  const [convictionFilter, setConvictionFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data, isLoading } = useWatchlist(sortBy, order);

  const { data: alertsData } = useQuery({
    queryKey: ["alerts", "all"],
    queryFn: () => fetchAlerts(false),
    enabled: activeTab === "alerts",
  });

  const refreshMutation = useMutation({
    mutationFn: refreshPrices,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watchlist"] }),
  });

  const markReadMutation = useMutation({
    mutationFn: markAlertsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const handleSort = (col: string) => {
    if (col === sortBy) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setOrder("desc");
    }
  };

  const handleRowClick = (entry: WatchlistEntry) => {
    navigate(`/stock/${entry.ticker}`);
  };

  // Get unique sectors for filter
  const sectors = data
    ? [...new Set(data.entries.map((e) => e.sector).filter(Boolean))]
    : [];

  // Filter entries
  const filteredEntries = data?.entries.filter((e) => {
    if (sectorFilter !== "all" && e.sector !== sectorFilter) return false;
    if (convictionFilter !== "all" && e.conviction !== convictionFilter)
      return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Watchlist</h1>
          {data && (
            <p className="text-sm text-muted-foreground mt-1">
              {data.total} stock{data.total !== 1 ? "s" : ""} tracked
            </p>
          )}
        </div>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
        >
          {refreshMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh Prices
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-4">
        <button
          onClick={() => setActiveTab("watchlist")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "watchlist"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Watchlist
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5",
            activeTab === "alerts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Bell className="w-3.5 h-3.5" />
          Alerts
          {alertsData && alertsData.unread_count > 0 && (
            <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">
              {alertsData.unread_count}
            </span>
          )}
        </button>
      </div>

      {activeTab === "watchlist" && (
        <>
          {/* Filters */}
          {data && data.entries.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="text-xs bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground"
              >
                <option value="all">All Sectors</option>
                {sectors.map((s) => (
                  <option key={s} value={s!}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={convictionFilter}
                onChange={(e) => setConvictionFilter(e.target.value)}
                className="text-xs bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground"
              >
                <option value="all">All Conviction</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-16 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : !filteredEntries || filteredEntries.length === 0 ? (
              <div className="p-16 text-center">
                <Star className="w-10 h-10 mx-auto text-muted-foreground/30" />
                <p className="text-foreground text-lg font-medium mt-4">
                  No watchlist entries
                  {sectorFilter !== "all" || convictionFilter !== "all"
                    ? " match your filters"
                    : " yet"}
                </p>
                <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
                  {sectorFilter === "all" && convictionFilter === "all"
                    ? "Head to Actions and trigger a watchlist build, or add stocks from the stock profile page."
                    : "Try adjusting your filters."}
                </p>
              </div>
            ) : (
              <>
                <WatchlistTable
                  entries={filteredEntries}
                  sortBy={sortBy}
                  order={order}
                  onSort={handleSort}
                  onRowClick={handleRowClick}
                />
                {data!.entries[0]?.price_updated_at && (
                  <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
                    Prices updated{" "}
                    {formatDate(data!.entries[0].price_updated_at)}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {activeTab === "alerts" && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {!alertsData || alertsData.alerts.length === 0 ? (
            <div className="p-16 text-center">
              <Bell className="w-10 h-10 mx-auto text-muted-foreground/30" />
              <p className="text-foreground text-lg font-medium mt-4">
                No alerts yet
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Alerts are triggered when stocks hit target prices.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {alertsData.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-center justify-between px-4 py-3",
                    !alert.is_read && "bg-primary/5",
                  )}
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(`/stock/${alert.ticker}`)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-primary">
                        {alert.ticker}
                      </span>
                      <span className="text-sm text-foreground">
                        {alert.message}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(alert.created_at)}
                    </p>
                  </div>
                  {!alert.is_read && (
                    <button
                      onClick={() => markReadMutation.mutate([alert.id])}
                      className="ml-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Dismiss
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
