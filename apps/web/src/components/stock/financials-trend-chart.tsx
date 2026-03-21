import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { FinancialYear } from "../../types";

function fmtB(val: number): string {
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toLocaleString()}`;
}

export default function FinancialsTrendChart({
  years,
}: {
  years: FinancialYear[];
}) {
  const data = years.map((y) => ({
    year: y.year,
    Revenue: y.revenue,
    EBITDA: y.ebitda,
    "Net Margin": y.net_margin != null ? +(y.net_margin * 100).toFixed(1) : null,
  }));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v: number) => fmtB(v)}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v: number) => `${v}%`}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value, name) => {
              const v = Number(value);
              if (name === "Net Margin") return [`${v}%`, name];
              return [fmtB(v), String(name)];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar
            yAxisId="left"
            dataKey="Revenue"
            fill="hsl(var(--primary))"
            opacity={0.7}
            radius={[2, 2, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="EBITDA"
            fill="hsl(var(--primary))"
            opacity={0.4}
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Net Margin"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3, fill: "#10b981" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
