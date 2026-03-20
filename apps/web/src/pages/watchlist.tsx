import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Loader2, Star } from "lucide-react";
import { useWatchlist } from "../hooks/use-watchlist";
import { refreshPrices } from "../api/watchlist";
import WatchlistTable from "../components/watchlist/watchlist-table";
import TickerDrawer from "../components/watchlist/ticker-drawer";
import { formatDate } from "../lib/format";
import type { WatchlistEntry } from "../types";

export default function WatchlistPage() {
  const [sortBy, setSortBy] = useState("mention_date");
  const [order, setOrder] = useState("desc");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useWatchlist(sortBy, order);

  const drawerEntry = selectedTicker
    ? data?.entries.find((e) => e.ticker === selectedTicker) ?? null
    : null;

  const refreshMutation = useMutation({
    mutationFn: refreshPrices,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watchlist"] }),
  });

  const handleSort = (col: string) => {
    if (col === sortBy) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setOrder("desc");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Watchlist</h1>
          {data && (
            <p className="text-sm text-muted-foreground mt-1">
              {data.total} pitch{data.total !== 1 ? "es" : ""} tracked
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

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : !data || data.entries.length === 0 ? (
          <div className="p-16 text-center">
            <Star className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-foreground text-lg font-medium mt-4">No watchlist entries yet</p>
            <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
              Head to Actions and trigger a watchlist build to get started.
            </p>
          </div>
        ) : (
          <>
            <WatchlistTable
              entries={data.entries}
              sortBy={sortBy}
              order={order}
              onSort={handleSort}
              onRowClick={(entry: WatchlistEntry) => setSelectedTicker(entry.ticker)}
            />
            {data.entries[0]?.price_updated_at && (
              <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
                Prices updated {formatDate(data.entries[0].price_updated_at)}
              </div>
            )}
          </>
        )}
      </div>

      <TickerDrawer entry={drawerEntry} onClose={() => setSelectedTicker(null)} />
    </div>
  );
}
