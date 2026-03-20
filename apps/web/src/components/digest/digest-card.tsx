import type { DigestDetail } from "../../types";
import ArticleCard from "./article-card";

export default function DigestCard({ digest }: { digest: DigestDetail }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1.5">
          Daily Digest
        </p>
        <h2 className="text-2xl font-bold text-foreground">{digest.date}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {digest.article_count} article
          {digest.article_count !== 1 ? "s" : ""}
        </p>
      </div>

      {digest.overview && (
        <div className="mx-6 mb-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1.5">
            Highlights
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">{digest.overview}</p>
        </div>
      )}

      <div className="px-6 pb-4">
        {digest.articles.map((article, i) => (
          <ArticleCard key={article.id} article={article} index={i + 1} />
        ))}
      </div>
    </div>
  );
}
