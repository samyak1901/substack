import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "../../lib/cn";

export default function PriceChange({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-muted-foreground text-sm">N/A</span>;
  }

  const isPositive = pct >= 0;
  const Icon = pct === 0 ? Minus : isPositive ? TrendingUp : TrendingDown;
  const sign = pct >= 0 ? "+" : "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-semibold font-mono",
        isPositive ? "text-emerald-600" : "text-rose-600"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {sign}{pct.toFixed(2)}%
    </span>
  );
}
