import type { WatchlistEntry } from "../types";
import { formatPrice, formatDate } from "../lib/format";

function formatMarketCap(cap: number | null): string {
  if (cap === null || cap === undefined) return "N/A";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
}

export default function TickerDrawer({
  entry,
  onClose,
}: {
  entry: WatchlistEntry | null;
  onClose: () => void;
}) {
  if (!entry) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto border-l border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{entry.ticker}</h2>
              <p className="text-sm text-gray-500">{entry.company}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Conviction</p>
              <p className="mt-1 text-sm font-semibold text-gray-800 capitalize">{entry.conviction || "N/A"}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Target Price</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{formatPrice(entry.target_price)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sector</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{entry.sector || "N/A"}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Market Cap</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{formatMarketCap(entry.market_cap)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Entry Price</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{formatPrice(entry.price_at_mention)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Current Price</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{formatPrice(entry.current_price)}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Reasoning</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{entry.reasoning || "No reasoning provided."}</p>
          </div>

          {entry.notes && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{entry.notes}</p>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Article</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {entry.article_url ? (
                <a
                  href={entry.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors"
                >
                  {entry.article_title || "View Article"}
                </a>
              ) : (
                <p className="text-sm text-gray-500">{entry.article_title || "No article"}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{entry.publication}</span>
                {entry.author && (
                  <>
                    <span>&middot;</span>
                    <span>{entry.author}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400">{formatDate(entry.mention_date)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
