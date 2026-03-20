import { Link, useParams } from "react-router-dom";
import { Loader2, FileText } from "lucide-react";
import { cn } from "../lib/cn";
import { useDigests, useDigest, useLatestDigest } from "../hooks/use-digests";
import DigestCard from "../components/digest/digest-card";
import DigestArchive from "../components/digest/digest-archive";

function DigestContent({ id }: { id?: number }) {
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
        <p className="text-foreground text-lg font-medium mt-4">No digests yet</p>
        <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
          Head to Actions and trigger a digest generation to get started.
        </p>
      </div>
    );
  }

  return <DigestCard digest={digest} />;
}

export default function DigestPage() {
  const { id } = useParams<{ id: string }>();
  const digestId = id ? parseInt(id, 10) : undefined;
  const { data: archiveData } = useDigests();

  const currentId = digestId ?? archiveData?.digests[0]?.id;

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
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
                      : "bg-secondary text-muted-foreground border-border"
                  )}
                >
                  {d.date}
                </Link>
              ))}
            </div>
          </div>
        )}
        <DigestContent id={digestId} />
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
