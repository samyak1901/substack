import type { DigestDetail } from "../types";
import ArticleCard from "./ArticleCard";

export default function DigestCard({ digest }: { digest: DigestDetail }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-8 pt-8 pb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-purple-400 mb-2">
          Daily Digest
        </p>
        <h2 className="text-2xl font-bold text-gray-900">{digest.date}</h2>
        <p className="text-sm text-gray-400 mt-1">
          {digest.article_count} article
          {digest.article_count !== 1 ? "s" : ""}
        </p>
      </div>

      {digest.overview && (
        <div className="mx-8 mb-2 px-5 py-4 rounded-xl bg-purple-50 border border-purple-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-2">
            Highlights
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            {digest.overview}
          </p>
        </div>
      )}

      <div className="px-8 pb-4">
        {digest.articles.map((article, i) => (
          <ArticleCard key={article.id} article={article} index={i + 1} />
        ))}
      </div>
    </div>
  );
}
