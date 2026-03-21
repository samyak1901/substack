import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { PricePoint } from "../../types";

export default function PriceChart({ data }: { data: PricePoint[] }) {
  // Sample data to ~250 points for performance
  const step = Math.max(1, Math.floor(data.length / 250));
  const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  const minPrice = Math.min(...sampled.map((d) => d.low));
  const maxPrice = Math.max(...sampled.map((d) => d.high));
  const padding = (maxPrice - minPrice) * 0.05;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sampled} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(d: string) => {
              const date = new Date(d);
              return date.toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit",
              });
            }}
            interval={Math.floor(sampled.length / 6)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minPrice - padding, maxPrice + padding]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 12,
            }}
            labelFormatter={(d) =>
              new Date(String(d)).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            }
            formatter={(value) => [`$${Number(value).toFixed(2)}`, "Close"]}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            fill="url(#priceGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
