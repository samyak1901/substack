import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { triggerDigest, triggerWatchlist } from "../api/jobs";
import { refreshPrices } from "../api/watchlist";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [weeks, setWeeks] = useState(1);
  const [jobMessage, setJobMessage] = useState("");

  const digestMutation = useMutation({
    mutationFn: triggerDigest,
    onSuccess: (data) => {
      setJobMessage(data.message);
      queryClient.invalidateQueries({ queryKey: ["digests"] });
    },
  });

  const watchlistMutation = useMutation({
    mutationFn: () => triggerWatchlist(weeks),
    onSuccess: (data) => {
      setJobMessage(data.message);
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });

  const priceMutation = useMutation({
    mutationFn: refreshPrices,
    onSuccess: (data) => {
      setJobMessage(data.message);
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Actions</h1>
      <p className="text-sm text-gray-400 mb-8">
        Digest runs daily and watchlist updates weekly. Use these to trigger
        manually.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Digest
          </h2>
          <button
            onClick={() => digestMutation.mutate()}
            disabled={digestMutation.isPending}
            className="px-5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
          >
            {digestMutation.isPending ? "Generating..." : "Generate Digest"}
          </button>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Watchlist
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => watchlistMutation.mutate()}
              disabled={watchlistMutation.isPending}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
            >
              {watchlistMutation.isPending
                ? "Building..."
                : "Build Watchlist"}
            </button>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={52}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className="w-16 px-3 py-2.5 rounded-xl text-sm text-gray-700 bg-gray-50 border border-gray-200 outline-none text-center focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
              />
              <span className="text-sm text-gray-400">weeks</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Prices
          </h2>
          <button
            onClick={() => priceMutation.mutate()}
            disabled={priceMutation.isPending}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
          >
            {priceMutation.isPending ? "Refreshing..." : "Refresh Prices"}
          </button>
        </div>
      </div>

      {jobMessage && (
        <p className="mt-4 text-sm text-emerald-600">{jobMessage}</p>
      )}
    </div>
  );
}
