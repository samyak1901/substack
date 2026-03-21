import { useState } from "react";
import { Info } from "lucide-react";

interface StatItem {
  label: string;
  value: string | null | undefined;
}

export default function StatsGrid({
  title,
  items,
  explanations,
}: {
  title: string;
  items: StatItem[];
  explanations?: Record<string, string> | null;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {items.map((item) => (
          <StatRow
            key={item.label}
            label={item.label}
            value={item.value}
            explanation={explanations?.[item.label] || explanations?.[item.label.replace("/", " ")] || null}
          />
        ))}
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  explanation,
}: {
  label: string;
  value: string | null | undefined;
  explanation: string | null;
}) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="relative flex justify-between py-1 group">
      <span className="text-sm text-muted-foreground flex items-center gap-1">
        {label}
        {explanation && (
          <button
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            onClick={() => setShowTip(!showTip)}
            className="text-muted-foreground/50 hover:text-muted-foreground"
          >
            <Info className="w-3 h-3" />
          </button>
        )}
      </span>
      <span className="text-sm font-medium text-foreground tabular-nums">
        {value ?? "—"}
      </span>
      {showTip && explanation && (
        <div className="absolute left-0 top-full z-50 mt-1 w-60 p-2 bg-card border border-border rounded-lg shadow-lg text-xs text-foreground/80">
          {explanation}
        </div>
      )}
    </div>
  );
}
