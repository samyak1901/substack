import { useParams } from "react-router-dom";
import { useDigests, useDigest, useLatestDigest } from "../hooks/useDigests";
import DigestCard from "../components/DigestCard";
import DigestArchive from "../components/DigestArchive";

function DigestContent({ id }: { id?: number }) {
  const latestQuery = useLatestDigest();
  const specificQuery = useDigest(id ?? 0, { enabled: id !== undefined });

  const query = id ? specificQuery : latestQuery;
  const digest = query.data;

  if (query.isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
        <div className="inline-block w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-400">Loading digest...</p>
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
        <div className="text-4xl mb-4 opacity-30">&#9776;</div>
        <p className="text-gray-500 text-lg font-medium">No digests yet</p>
        <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
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

  return (
    <div className="flex gap-8">
      <div className="flex-1 min-w-0">
        <DigestContent id={digestId} />
      </div>
      {archiveData && archiveData.digests.length > 1 && (
        <div className="w-60 flex-shrink-0 hidden lg:block">
          <div className="sticky top-24">
            <DigestArchive
              digests={archiveData.digests}
              currentId={digestId ?? archiveData.digests[0]?.id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
