import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, FileSearch } from "lucide-react";
import { searchArticles } from "../api/digests";
import ArticleCard from "../components/digest/article-card";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [inputValue, setInputValue] = useState(urlQuery);
  const page = Number(searchParams.get("page") || "1");

  const { data, isLoading } = useQuery({
    queryKey: ["search", urlQuery, page],
    queryFn: () => searchArticles(urlQuery, page),
    enabled: urlQuery.length >= 2,
  });

  const handleSearch = () => {
    if (inputValue.trim().length >= 2) {
      setSearchParams({ q: inputValue.trim() });
    }
  };

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-4">Search Articles</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by title, author, or content..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-secondary border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {!urlQuery && (
        <div className="text-center py-16 text-muted-foreground">
          <FileSearch className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Search across all your digest articles.</p>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p>Searching...</p>
        </div>
      )}

      {data && data.articles.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FileSearch className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No results found for "{urlQuery}".</p>
        </div>
      )}

      {data && data.articles.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {data.total} result{data.total !== 1 ? "s" : ""} for "{urlQuery}"
          </p>
          <div className="bg-card rounded-xl border border-border shadow-sm px-6">
            {data.articles.map((article, i) => (
              <ArticleCard key={article.id} article={article} index={i + 1 + (page - 1) * data.page_size} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setSearchParams({ q: urlQuery, page: String(p) })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    p === page
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
