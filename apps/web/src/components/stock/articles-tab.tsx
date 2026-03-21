import { ExternalLink, Clock } from "lucide-react";
import { useStockArticles } from "../../hooks/use-stock";
import { formatDate } from "../../lib/format";

const CATEGORY_COLORS: Record<string, string> = {
  macro: "bg-blue-100 text-blue-700",
  tech: "bg-violet-100 text-violet-700",
  energy: "bg-amber-100 text-amber-700",
  healthcare: "bg-teal-100 text-teal-700",
  financials: "bg-emerald-100 text-emerald-700",
  crypto: "bg-orange-100 text-orange-700",
  "real-estate": "bg-rose-100 text-rose-700",
  consumer: "bg-pink-100 text-pink-700",
  industrials: "bg-gray-100 text-gray-700",
};

export default function ArticlesTab({ ticker }: { ticker: string }) {
  const { data, isLoading } = useStockArticles(ticker);

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground text-sm">Loading articles...</p>
      </div>
    );
  }

  if (!data?.articles?.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground text-sm">
          No articles mentioning {ticker} found in your digests yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {data.total} article{data.total !== 1 ? "s" : ""} mentioning {ticker}
      </p>
      {data.articles.map((article) => (
        <div
          key={article.id}
          className="bg-card rounded-xl border border-border p-5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground">
                {article.url ? (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors inline-flex items-center gap-1"
                  >
                    {article.title}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                ) : (
                  article.title
                )}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{article.publication}</span>
                {article.author && (
                  <>
                    <span>&middot;</span>
                    <span>{article.author}</span>
                  </>
                )}
                <span>&middot;</span>
                <span>{formatDate(article.digest_date)}</span>
                {article.reading_time_minutes > 0 && (
                  <>
                    <span>&middot;</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {article.reading_time_minutes} min
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {article.category && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[article.category] || "bg-secondary text-muted-foreground"}`}
                  >
                    {article.category}
                  </span>
                )}
              </div>
            </div>
          </div>
          {article.summary_html && (
            <div
              className="mt-3 text-sm text-foreground/80 leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: article.summary_html }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
