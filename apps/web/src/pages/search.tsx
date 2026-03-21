import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, FileSearch, ExternalLink, Check, Clock } from "lucide-react";
import { unifiedSearch } from "../api/stock";
import { cn } from "../lib/cn";

const CATEGORY_STYLES: Record<string, string> = {
  macro: "bg-blue-100 text-blue-700",
  tech: "bg-violet-100 text-violet-700",
  energy: "bg-amber-100 text-amber-700",
  healthcare: "bg-emerald-100 text-emerald-700",
  financials: "bg-indigo-100 text-indigo-700",
  crypto: "bg-orange-100 text-orange-700",
  "real-estate": "bg-teal-100 text-teal-700",
  consumer: "bg-pink-100 text-pink-700",
  industrials: "bg-slate-100 text-slate-700",
};

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [inputValue, setInputValue] = useState(urlQuery);

  const { data, isLoading } = useQuery({
    queryKey: ["unified-search", urlQuery],
    queryFn: () => unifiedSearch(urlQuery),
    enabled: urlQuery.length >= 1,
  });

  const handleSearch = () => {
    if (inputValue.trim().length >= 1) {
      setSearchParams({ q: inputValue.trim() });
    }
  };

  const hasStocks = data?.stocks && data.stocks.length > 0;
  const hasArticles = data?.articles && data.articles.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-4">Search</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search stocks & articles..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-secondary border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {!urlQuery && (
        <div className="text-center py-16 text-muted-foreground">
          <FileSearch className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Search for stocks or articles across your digests.</p>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p>Searching...</p>
        </div>
      )}

      {data && !hasStocks && !hasArticles && (
        <div className="text-center py-16 text-muted-foreground">
          <FileSearch className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No results found for "{urlQuery}".</p>
        </div>
      )}

      {/* Stocks section */}
      {hasStocks && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Stocks
          </h2>
          <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
            {data!.stocks.map((stock) => (
              <Link
                key={stock.ticker}
                to={`/stock/${stock.ticker}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">
                    {stock.ticker}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {stock.company_name}
                  </span>
                  {stock.exchange && (
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                      {stock.exchange}
                    </span>
                  )}
                </div>
                {stock.on_watchlist && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                    <Check className="w-3 h-3" /> On Watchlist
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Articles section */}
      {hasArticles && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Articles ({data!.articles.length} results)
          </h2>
          <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
            {data!.articles.map((article) => (
              <div
                key={article.id}
                className="px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
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
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{article.publication}</span>
                      {article.author && (
                        <>
                          <span>&middot;</span>
                          <span>{article.author}</span>
                        </>
                      )}
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
                    {article.category && (
                      <span
                        className={cn(
                          "inline-block mt-1 text-xs px-2 py-0.5 rounded",
                          CATEGORY_STYLES[article.category] ||
                            "bg-secondary text-muted-foreground"
                        )}
                      >
                        {article.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
