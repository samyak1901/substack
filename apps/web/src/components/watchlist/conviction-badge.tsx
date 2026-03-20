import { cn } from "../../lib/cn";

const CONVICTION_STYLES = {
  high: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-rose-100 text-rose-700 border-rose-200",
} as const;

export default function ConvictionBadge({ value }: { value: string | null }) {
  const level = (value || "medium") as keyof typeof CONVICTION_STYLES;
  const style = CONVICTION_STYLES[level] || CONVICTION_STYLES.medium;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border capitalize",
        style
      )}
    >
      {level}
    </span>
  );
}
