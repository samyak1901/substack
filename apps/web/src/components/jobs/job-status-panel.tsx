import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { JobProgress } from "../../types";

export function JobStatusPanel({ progress }: { progress: JobProgress | null }) {
  if (!progress) return null;

  const isRunning = progress.status === "pending" || progress.status === "running";
  const isFailed = progress.status === "failed";
  const isComplete = progress.status === "completed";

  if (!isRunning && !isFailed && !isComplete) return null;

  const Icon = isFailed ? AlertCircle : isComplete ? CheckCircle2 : Loader2;
  const message = isFailed
    ? progress.error_message || "Job failed. Check API logs for details."
    : isComplete
      ? progress.result_message || "Job completed."
      : progress.current_step || "Running...";

  return (
    <div
      className={`rounded-xl border p-4 ${
        isFailed
          ? "border-destructive/30 bg-destructive/5"
          : isComplete
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-primary/30 bg-primary/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            isRunning ? "animate-spin text-primary" : isFailed ? "text-destructive" : "text-emerald-600"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground capitalize">
              {progress.status.replace("_", " ")}
            </p>
            {isRunning && (
              <p className="text-xs tabular-nums text-muted-foreground">
                {progress.progress_pct}%
              </p>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {message}
          </p>
          {isRunning && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress.progress_pct}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
