import { useState, useRef } from "react";
import type { WatchlistEntry } from "../types";
import { formatPrice, formatPriceChange } from "../lib/format";
import { useUpdateEntry } from "../hooks/useWatchlist";

const COLUMNS: { key: string; label: string; sortable: boolean }[] = [
  { key: "ticker", label: "Ticker", sortable: true },
  { key: "company", label: "Company", sortable: true },
  { key: "price_at_mention", label: "Entry", sortable: true },
  { key: "current_price", label: "Current", sortable: true },
  { key: "change", label: "Change", sortable: false },
  { key: "conviction", label: "Conviction", sortable: false },
  { key: "notes", label: "Notes", sortable: false },
  { key: "mention_date", label: "Date", sortable: true },
  { key: "publication", label: "Source", sortable: false },
];

const CONVICTION_OPTIONS = ["high", "medium", "low"];

function ConvictionCell({
  value,
  ticker,
}: {
  value: string | null;
  ticker: string;
}) {
  const updateMutation = useUpdateEntry();

  return (
    <select
      value={value || "medium"}
      onChange={(e) => {
        e.stopPropagation();
        updateMutation.mutate({ ticker, data: { conviction: e.target.value } });
      }}
      onClick={(e) => e.stopPropagation()}
      className="bg-transparent border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-purple-400 cursor-pointer"
    >
      {CONVICTION_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function NotesCell({
  value,
  ticker,
}: {
  value: string | null;
  ticker: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const updateMutation = useUpdateEntry();

  const handleBlur = () => {
    setEditing(false);
    if (draft !== (value || "")) {
      updateMutation.mutate({ ticker, data: { notes: draft } });
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setDraft(value || "");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleBlur();
          if (e.key === "Escape") {
            setDraft(value || "");
            setEditing(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-white border border-purple-300 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
      />
    );
  }

  return (
    <span
      onClick={handleClick}
      className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 truncate block max-w-[150px]"
      title={value || "Click to add notes"}
    >
      {value || "..."}
    </span>
  );
}

export default function WatchlistTable({
  entries,
  sortBy,
  order,
  onSort,
  onRowClick,
}: {
  entries: WatchlistEntry[];
  sortBy: string;
  order: string;
  onSort: (col: string) => void;
  onRowClick: (entry: WatchlistEntry) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3.5 text-left font-medium text-gray-400 uppercase tracking-wider text-xs ${
                  col.sortable ? "cursor-pointer hover:text-gray-600 transition-colors" : ""
                }`}
                onClick={() => col.sortable && onSort(col.key)}
              >
                {col.label}
                {col.sortable && sortBy === col.key && (
                  <span className="ml-1 text-purple-500">{order === "asc" ? "▲" : "▼"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const change = formatPriceChange(entry.price_change_pct);
            return (
              <tr
                key={entry.ticker}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onRowClick(entry)}
              >
                <td className="px-4 py-3.5 font-bold text-purple-600">
                  {entry.ticker}
                </td>
                <td className="px-4 py-3.5 text-gray-700">{entry.company}</td>
                <td className="px-4 py-3.5 font-mono text-gray-500">
                  {formatPrice(entry.price_at_mention)}
                </td>
                <td className="px-4 py-3.5 font-mono text-gray-700">
                  {formatPrice(entry.current_price)}
                </td>
                <td className={`px-4 py-3.5 font-mono font-semibold ${change.color}`}>
                  {change.text}
                </td>
                <td className="px-4 py-3.5">
                  <ConvictionCell value={entry.conviction} ticker={entry.ticker} />
                </td>
                <td className="px-4 py-3.5">
                  <NotesCell value={entry.notes} ticker={entry.ticker} />
                </td>
                <td className="px-4 py-3.5 text-gray-400">{entry.mention_date}</td>
                <td className="px-4 py-3.5">
                  {entry.article_url ? (
                    <a
                      href={entry.article_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-500 hover:text-purple-700 transition-colors"
                      title={entry.article_title}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {entry.publication || "Link"}
                    </a>
                  ) : (
                    <span className="text-gray-400">{entry.publication}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
