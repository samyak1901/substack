import { Link } from "react-router-dom";
import type { DigestSummary } from "../types";

export default function DigestArchive({
  digests,
  currentId,
}: {
  digests: DigestSummary[];
  currentId?: number;
}) {
  if (digests.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
        Archive
      </h3>
      <ul className="space-y-1">
        {digests.map((d) => (
          <li key={d.id}>
            <Link
              to={`/digests/${d.id}`}
              className={`block px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                d.id === currentId
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <span className="font-medium">{d.date}</span>
              <span className="text-gray-300 ml-2 text-xs">
                {d.article_count} article{d.article_count !== 1 ? "s" : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
