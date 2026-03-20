import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Newspaper, BarChart3, RefreshCw } from "lucide-react";
import { Toaster, toast } from "sonner";
import { triggerDigest, triggerWatchlist, triggerPriceRefresh } from "../api/jobs";
import { useJobProgress } from "../hooks/use-job-progress";
import type { JobProgress } from "../types";

function ProgressBar({ progress }: { progress: JobProgress }) {
  const isRunning = progress.status === "running";
  const isDone = progress.status === "completed";
  const isFailed = progress.status === "failed";

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs mb-1">
        <span className={isFailed ? "text-destructive" : "text-muted-foreground"}>
          {progress.current_step}
        </span>
        {isRunning && (
          <span className="text-muted-foreground">{progress.progress_pct}%</span>
        )}
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            isFailed
              ? "bg-destructive"
              : isDone
                ? "bg-emerald-500"
                : "bg-primary"
          }`}
          style={{ width: `${progress.progress_pct}%` }}
        />
      </div>
      {isDone && progress.result_message && (
        <p className="text-xs text-emerald-600 mt-1">{progress.result_message}</p>
      )}
      {isFailed && progress.error_message && (
        <p className="text-xs text-destructive mt-1">{progress.error_message}</p>
      )}
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  progress,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  progress?: JobProgress | null;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          <div className="mt-4">{children}</div>
          {progress && progress.status !== "pending" && (
            <ProgressBar progress={progress} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [weeks, setWeeks] = useState(1);

  const [digestJobId, setDigestJobId] = useState<string | null>(null);
  const [watchlistJobId, setWatchlistJobId] = useState<string | null>(null);
  const [priceJobId, setPriceJobId] = useState<string | null>(null);

  const digestProgress = useJobProgress(digestJobId);
  const watchlistProgress = useJobProgress(watchlistJobId);
  const priceProgress = useJobProgress(priceJobId);

  const digestMutation = useMutation({
    mutationFn: triggerDigest,
    onSuccess: (data) => {
      setDigestJobId(data.job_id);
      toast.success(data.message);
    },
    onError: () => toast.error("Failed to start digest generation"),
  });

  const watchlistMutation = useMutation({
    mutationFn: () => triggerWatchlist(weeks),
    onSuccess: (data) => {
      setWatchlistJobId(data.job_id);
      toast.success(data.message);
    },
    onError: () => toast.error("Failed to start watchlist build"),
  });

  const priceMutation = useMutation({
    mutationFn: triggerPriceRefresh,
    onSuccess: (data) => {
      setPriceJobId(data.job_id);
      toast.success(data.message);
    },
    onError: () => toast.error("Failed to start price refresh"),
  });

  const isDigestBusy =
    digestMutation.isPending || digestProgress?.status === "running";
  const isWatchlistBusy =
    watchlistMutation.isPending || watchlistProgress?.status === "running";
  const isPriceBusy =
    priceMutation.isPending || priceProgress?.status === "running";

  // Invalidate queries when jobs complete
  if (digestProgress?.status === "completed" && digestJobId) {
    queryClient.invalidateQueries({ queryKey: ["digests"] });
  }
  if (
    (watchlistProgress?.status === "completed" ||
      priceProgress?.status === "completed") &&
    (watchlistJobId || priceJobId)
  ) {
    queryClient.invalidateQueries({ queryKey: ["watchlist"] });
  }

  return (
    <div>
      <Toaster position="bottom-right" richColors />
      <h1 className="text-2xl font-bold text-foreground mb-1">Actions</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Digest runs daily and watchlist updates weekly. Use these to trigger
        manually.
      </p>

      <div className="space-y-4">
        <ActionCard
          icon={Newspaper}
          title="Generate Digest"
          description="Fetch and summarize articles from the last 24 hours."
          progress={digestProgress}
        >
          <button
            onClick={() => digestMutation.mutate()}
            disabled={isDigestBusy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {isDigestBusy && <Loader2 className="w-4 h-4 animate-spin" />}
            {isDigestBusy ? "Generating..." : "Generate Digest"}
          </button>
        </ActionCard>

        <ActionCard
          icon={BarChart3}
          title="Build Watchlist"
          description="Extract stock pitches from paid subscription articles."
          progress={watchlistProgress}
        >
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => watchlistMutation.mutate()}
              disabled={isWatchlistBusy}
              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-40"
            >
              {isWatchlistBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              {isWatchlistBusy ? "Building..." : "Build Watchlist"}
            </button>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={52}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className="w-16 px-3 py-2 rounded-lg text-sm text-foreground bg-secondary border border-border outline-none text-center focus:ring-1 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">weeks</span>
            </div>
          </div>
        </ActionCard>

        <ActionCard
          icon={RefreshCw}
          title="Refresh Prices"
          description="Update current prices for all watchlist entries."
          progress={priceProgress}
        >
          <button
            onClick={() => priceMutation.mutate()}
            disabled={isPriceBusy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-40"
          >
            {isPriceBusy && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPriceBusy ? "Refreshing..." : "Refresh Prices"}
          </button>
        </ActionCard>
      </div>
    </div>
  );
}
