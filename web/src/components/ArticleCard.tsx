import type { Article } from "../types";

export default function ArticleCard({
  article,
  index,
}: {
  article: Article;
  index: number;
}) {
  return (
    <div className="py-6 border-b border-gray-100 last:border-b-0">
      <div className="flex items-start gap-4">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-50 text-purple-600 text-xs font-bold flex items-center justify-center border border-purple-200">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold leading-tight text-gray-900">
            {article.url ? (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-purple-600 transition-colors"
              >
                {article.title}
              </a>
            ) : (
              article.title
            )}
          </h3>
          <p className="mt-1.5 text-sm text-gray-400">
            {article.author}
            {article.publication && (
              <>
                {" "}
                &middot;{" "}
                <span className="text-purple-500">
                  {article.publication}
                </span>
              </>
            )}
          </p>
          <div
            className="mt-3 text-sm text-gray-600 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5 [&_strong]:text-gray-800 [&_em]:text-gray-700"
            dangerouslySetInnerHTML={{ __html: article.summary_html }}
          />
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors"
            >
              Read article
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
