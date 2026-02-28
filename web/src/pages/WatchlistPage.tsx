import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWatchlist } from "../hooks/useWatchlist";
import { refreshPrices } from "../api/watchlist";
import WatchlistTable from "../components/WatchlistTable";
import TickerDrawer from "../components/TickerDrawer";
import { formatDate } from "../lib/format";
import type { WatchlistEntry } from "../types";

export default function WatchlistPage() {
  const [sortBy, setSortBy] = useState("mention_date");
  const [order, setOrder] = useState("desc");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useWatchlist(sortBy, order);

  // Derive drawer entry from query data so optimistic updates are reflected
  const drawerEntry = selectedTicker
    ? data?.entries.find((e) => e.ticker === selectedTicker) ?? null
    : null;

  const refreshMutation = useMutation({
    mutationFn: refreshPrices,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["watchlist"] }),
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Watchlist</h1>
          {data && (
            <p className="text-sm text-gray-400 mt-1">
              {data.total} pitch{data.total !== 1 ? "es" : ""} tracked
            </p>
          )}
        </div>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
        >
          {refreshMutation.isPending ? "Refreshing..." : "Refresh Prices"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center">
            <div className="inline-block w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
            <p className="mt-4 text-sm text-gray-400">Loading...</p>
          </div>
        ) : !data || data.entries.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-4 opacity-30">&#9734;</div>
            <p className="text-gray-500 text-lg font-medium">No watchlist entries yet</p>
            <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
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
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
                Prices updated {formatDate(data.entries[0].price_updated_at)}
              </div>
            )}
          </>
        )}
      </div>

      <TickerDrawer
        entry={drawerEntry}
        onClose={() => setSelectedTicker(null)}
      />
    </div>
  );
}
