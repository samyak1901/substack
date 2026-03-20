import { useState, useRef } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { WatchlistEntry } from "../../types";
import { formatPrice } from "../../lib/format";
import { cn } from "../../lib/cn";
import { useUpdateEntry } from "../../hooks/use-watchlist";
import PriceChange from "./price-change";

const COLUMNS = [
  { key: "ticker", label: "Ticker", sortable: true, hide: "" },
  { key: "company", label: "Company", sortable: true, hide: "hidden md:table-cell" },
  { key: "price_at_mention", label: "Entry", sortable: true, hide: "" },
  { key: "current_price", label: "Current", sortable: true, hide: "" },
  { key: "change", label: "Change", sortable: false, hide: "" },
  { key: "conviction", label: "Conviction", sortable: false, hide: "" },
  { key: "notes", label: "Notes", sortable: false, hide: "hidden lg:table-cell" },
  { key: "mention_date", label: "Date", sortable: true, hide: "hidden md:table-cell" },
  { key: "publication", label: "Source", sortable: false, hide: "hidden lg:table-cell" },
] as const;

const CONVICTION_OPTIONS = ["high", "medium", "low"] as const;

function ConvictionCell({ value, ticker }: { value: string | null; ticker: string }) {
  const updateMutation = useUpdateEntry();

  return (
    <select
      value={value || "medium"}
      onChange={(e) => {
        e.stopPropagation();
        updateMutation.mutate({ ticker, data: { conviction: e.target.value } });
      }}
      onClick={(e) => e.stopPropagation()}
      className="bg-transparent border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
    >
      {CONVICTION_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function NotesCell({ value, ticker }: { value: string | null; ticker: string }) {
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
        className="w-full bg-card border border-ring rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    );
  }

  return (
    <span
      onClick={handleClick}
      className="text-xs text-muted-foreground cursor-pointer hover:text-foreground truncate block max-w-[150px]"
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
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b border-border">
            {COLUMNS.map((col) => {
              const isSorted = sortBy === col.key;
              const SortIcon = isSorted
                ? order === "asc" ? ArrowUp : ArrowDown
                : ArrowUpDown;
              return (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left font-medium text-muted-foreground uppercase tracking-wider text-xs",
                    col.sortable && "cursor-pointer hover:text-foreground transition-colors select-none",
                    col.hide
                  )}
                  onClick={() => col.sortable && onSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <SortIcon className={cn("w-3 h-3", isSorted && "text-primary")} />
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.ticker}
              className="border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer"
              onClick={() => onRowClick(entry)}
            >
              <td className="px-4 py-3 font-bold text-primary">{entry.ticker}</td>
              <td className="px-4 py-3 text-foreground hidden md:table-cell">{entry.company}</td>
              <td className="px-4 py-3 font-mono text-muted-foreground">
                {formatPrice(entry.price_at_mention)}
              </td>
              <td className="px-4 py-3 font-mono text-foreground">
                {formatPrice(entry.current_price)}
              </td>
              <td className="px-4 py-3">
                <PriceChange pct={entry.price_change_pct} />
              </td>
              <td className="px-4 py-3">
                <ConvictionCell value={entry.conviction} ticker={entry.ticker} />
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <NotesCell value={entry.notes} ticker={entry.ticker} />
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{entry.mention_date}</td>
              <td className="px-4 py-3 hidden lg:table-cell">
                {entry.article_url ? (
                  <a
                    href={entry.article_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition-colors"
                    title={entry.article_title}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {entry.publication || "Link"}
                  </a>
                ) : (
                  <span className="text-muted-foreground">{entry.publication}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
