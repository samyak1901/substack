export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatPriceChange(pct: number | null): {
  text: string;
  color: string;
} {
  if (pct === null) return { text: "N/A", color: "text-muted-foreground" };
  const sign = pct >= 0 ? "+" : "";
  return {
    text: `${sign}${pct.toFixed(2)}%`,
    color: pct >= 0 ? "text-emerald-600" : "text-rose-600",
  };
}

export function formatPrice(price: number | null): string {
  if (price === null) return "N/A";
  return `$${price.toFixed(2)}`;
}

export function formatMarketCap(cap: number | null): string {
  if (cap === null || cap === undefined) return "N/A";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
}
