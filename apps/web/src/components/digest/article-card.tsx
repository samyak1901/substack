import { Clock, ExternalLink } from "lucide-react";
import { cn } from "../../lib/cn";
import type { Article } from "../../types";

const CATEGORY_STYLES: Record<string, string> = {
  macro: "bg-blue-100 text-blue-700 border-blue-200",
  tech: "bg-violet-100 text-violet-700 border-violet-200",
  energy: "bg-amber-100 text-amber-700 border-amber-200",
  healthcare: "bg-emerald-100 text-emerald-700 border-emerald-200",
  financials: "bg-indigo-100 text-indigo-700 border-indigo-200",
  crypto: "bg-orange-100 text-orange-700 border-orange-200",
  "real-estate": "bg-teal-100 text-teal-700 border-teal-200",
  consumer: "bg-pink-100 text-pink-700 border-pink-200",
  industrials: "bg-slate-100 text-slate-700 border-slate-200",
  other: "bg-secondary text-muted-foreground border-border",
};

export default function ArticleCard({
  article,
  index,
}: {
  article: Article;
  index: number;
}) {
  return (
    <div className="py-5 border-b border-border last:border-b-0">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold leading-tight text-foreground">
            {article.url ? (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                {article.title}
              </a>
            ) : (
              article.title
            )}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {article.author}
            {article.publication && (
              <>
                {" "}
                &middot; <span className="text-primary/70">{article.publication}</span>
              </>
            )}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            {article.category && (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-md font-medium border",
                  CATEGORY_STYLES[article.category] ||
                    "bg-secondary text-muted-foreground border-border"
                )}
              >
                {article.category}
              </span>
            )}
            {article.reading_time_minutes > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {article.reading_time_minutes} min read
              </span>
            )}
          </div>
          <div
            className="mt-3 text-sm text-foreground/80 leading-relaxed prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:text-foreground [&_em]:text-foreground/70"
            dangerouslySetInnerHTML={{ __html: article.summary_html }}
          />
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Read article
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
