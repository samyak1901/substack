import { useState } from "react";
import { Plus, Check, Loader2 } from "lucide-react";
import type { StockProfile } from "../../types";
import { useAddToWatchlist, useRemoveFromWatchlist } from "../../hooks/use-stock";

export default function WatchlistControls({ profile }: { profile: StockProfile }) {
  const watchlist = profile.watchlist;
  const onWatchlist = watchlist?.on_watchlist ?? false;

  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();

  const [conviction, setConviction] = useState(watchlist?.conviction || "medium");
  const [targetPrice, setTargetPrice] = useState(
    watchlist?.target_price?.toString() || ""
  );
  const [notes, setNotes] = useState(watchlist?.notes || "");

  const handleAdd = () => {
    addMutation.mutate({
      ticker: profile.ticker,
      company: profile.company,
      conviction,
      target_price: targetPrice ? parseFloat(targetPrice) : undefined,
      notes: notes || undefined,
    });
  };

  const handleRemove = () => {
    removeMutation.mutate(profile.ticker);
  };

  const handleUpdate = () => {
    addMutation.mutate({
      ticker: profile.ticker,
      company: profile.company,
      conviction,
      target_price: targetPrice ? parseFloat(targetPrice) : undefined,
      notes: notes || undefined,
    });
  };

  const isPending = addMutation.isPending || removeMutation.isPending;

  if (!onWatchlist) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <button
          onClick={handleAdd}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Add to Watchlist
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
          <Check className="w-4 h-4" />
          On Watchlist
        </span>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Conviction:</label>
          <select
            value={conviction}
            onChange={(e) => setConviction(e.target.value)}
            onBlur={handleUpdate}
            className="text-sm bg-secondary border border-border rounded px-2 py-1 text-foreground"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Target:</label>
          <input
            type="number"
            placeholder="$0.00"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            onBlur={handleUpdate}
            className="text-sm bg-secondary border border-border rounded px-2 py-1 text-foreground w-24"
          />
        </div>

        <button
          onClick={handleRemove}
          disabled={isPending}
          className="ml-auto text-xs text-muted-foreground hover:text-rose-600 transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="mt-3">
        <input
          type="text"
          placeholder="Add notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleUpdate}
          className="w-full text-sm bg-secondary border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted-foreground"
        />
      </div>
    </div>
  );
}
