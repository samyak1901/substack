import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, FileText } from "lucide-react";
import { cn } from "../lib/cn";
import { useDigests, useDigest, useLatestDigest } from "../hooks/use-digests";
import { triggerDigest } from "../api/jobs";
import { useJobProgress } from "../hooks/use-job-progress";
import { JobStatusPanel } from "../components/jobs/job-status-panel";
import DigestCard from "../components/digest/digest-card";
import DigestArchive from "../components/digest/digest-archive";

const CATEGORIES = [
  "all",
  "macro",
  "tech",
  "energy",
  "healthcare",
  "financials",
  "crypto",
  "real-estate",
  "consumer",
  "industrials",
] as const;

function DigestContent({
  id,
  categoryFilter,
  onGenerate,
  isGenerating,
}: {
  id?: number;
  categoryFilter: string;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const latestQuery = useLatestDigest();
  const specificQuery = useDigest(id ?? 0, { enabled: id !== undefined });

  const query = id ? specificQuery : latestQuery;
  const digest = query.data;

  if (query.isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-16 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading digest...</p>
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-16 text-center">
        <FileText className="w-10 h-10 mx-auto text-muted-foreground/30" />
        <p className="text-foreground text-lg font-medium mt-4">
          No digests yet
        </p>
          <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
            Generate a digest from recent Substack posts to start reading summarized ideas.
          </p>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
            {isGenerating ? "Generating..." : "Generate first digest"}
          </button>
        </div>
      );
  }

  // Filter articles by category
  const filteredDigest =
    categoryFilter === "all"
      ? digest
      : {
          ...digest,
          articles: digest.articles.filter(
            (a) => a.category === categoryFilter,
          ),
        };

  return <DigestCard digest={filteredDigest} />;
}

export default function DigestPage() {
  const { id } = useParams<{ id: string }>();
  const digestId = id ? parseInt(id, 10) : undefined;
  const { data: archiveData } = useDigests();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [jobId, setJobId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const progress = useJobProgress(jobId);
  const generateMutation = useMutation({
    mutationFn: triggerDigest,
    onSuccess: (data) => setJobId(data.job_id),
  });

  useEffect(() => {
    if (progress?.status !== "completed") return;
    queryClient.invalidateQueries({ queryKey: ["digests"] });
    queryClient.invalidateQueries({ queryKey: ["latest-digest"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }, [progress?.status, queryClient]);

  const currentId = digestId ?? archiveData?.digests[0]?.id;

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Digests</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Daily summaries of your Substack reading, grouped by market theme.
            </p>
          </div>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || progress?.status === "pending" || progress?.status === "running"}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {(generateMutation.isPending || progress?.status === "pending" || progress?.status === "running") && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {progress?.status === "pending" || progress?.status === "running" ? "Generating..." : "Generate digest"}
          </button>
        </div>

        <div className="mb-4">
          <JobStatusPanel progress={progress} />
        </div>

        {archiveData && archiveData.digests.length > 1 && (
          <div className="lg:hidden mb-4 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {archiveData.digests.slice(0, 10).map((d) => (
                <Link
                  key={d.id}
                  to={`/digests/${d.id}`}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap",
                    d.id === currentId
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-secondary text-muted-foreground border-border",
                  )}
                >
                  {d.date}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="mb-4 overflow-x-auto">
          <div className="flex gap-1.5 pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize",
                  categoryFilter === cat
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        </div>

        <DigestContent
          id={digestId}
          categoryFilter={categoryFilter}
          onGenerate={() => generateMutation.mutate()}
          isGenerating={generateMutation.isPending || progress?.status === "pending" || progress?.status === "running"}
        />
      </div>
      {archiveData && archiveData.digests.length > 1 && (
        <div className="w-56 flex-shrink-0 hidden lg:block">
          <div className="sticky top-20">
            <DigestArchive
              digests={archiveData.digests}
              currentId={currentId ?? archiveData.digests[0]?.id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
