import { useMemo, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Brush,
} from "recharts";
import type { PricePoint } from "../../types";

type DateRange = "1M" | "3M" | "6M" | "1Y" | "2Y" | "5Y";
type ChartType = "line" | "area";

const RANGE_DAYS: Record<DateRange, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "2Y": 730,
  "5Y": 1825,
};

const ALL_RANGES: DateRange[] = ["1M", "3M", "6M", "1Y", "2Y", "5Y"];
const COMPACT_RANGES: DateRange[] = ["1Y", "2Y", "5Y"];

function computeSMA(
  data: { close: number }[],
  window: number,
): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null;
    const slice = data.slice(i - window + 1, i + 1);
    return slice.reduce((sum, d) => sum + d.close, 0) / window;
  });
}

function formatVolume(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function formatPrice(value: number): string {
  return value.toFixed(2);
}

interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma50: number | null;
  sma200: number | null;
}

interface InteractiveChartProps {
  data: PricePoint[];
  compact?: boolean;
}

export default function InteractiveChart({
  data,
  compact = false,
}: InteractiveChartProps) {
  const [range, setRange] = useState<DateRange>(compact ? "2Y" : "1Y");
  const [chartType, setChartType] = useState<ChartType>("area");
  const [showSMA50, setShowSMA50] = useState(!compact);
  const [showSMA200, setShowSMA200] = useState(!compact);

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const days = RANGE_DAYS[range];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return data.filter((d) => d.date >= cutoffStr);
  }, [data, range]);

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (filteredData.length === 0) return [];
    const sma50 = computeSMA(filteredData, 50);
    const sma200 = computeSMA(filteredData, 200);
    return filteredData.map((d, i) => ({
      ...d,
      sma50: sma50[i],
      sma200: sma200[i],
    }));
  }, [filteredData]);

  const ranges = compact ? COMPACT_RANGES : ALL_RANGES;

  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 flex items-center justify-center h-64">
        <span className="text-muted-foreground text-sm">
          No price data available
        </span>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Date range buttons */}
        <div className="flex gap-1">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Chart type toggle */}
          <div className="flex gap-1">
            <button
              onClick={() => setChartType("line")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                chartType === "line"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setChartType("area")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                chartType === "area"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Area
            </button>
          </div>

          {/* MA toggles */}
          {!compact && (
            <div className="flex gap-1">
              <button
                onClick={() => setShowSMA50((v) => !v)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  showSMA50
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                50 SMA
              </button>
              <button
                onClick={() => setShowSMA200((v) => !v)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  showSMA200
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                200 SMA
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={compact ? 300 : 450}>
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.5}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v: string) => {
              const d = new Date(v);
              return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }}
            stroke="hsl(var(--border))"
            minTickGap={40}
          />
          <YAxis
            yAxisId="price"
            orientation="left"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v: number) => `$${formatPrice(v)}`}
            stroke="hsl(var(--border))"
            domain={["auto", "auto"]}
          />
          {!compact && (
            <YAxis
              yAxisId="volume"
              orientation="right"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={formatVolume}
              stroke="hsl(var(--border))"
              domain={[0, (max: number) => max * 3]}
            />
          )}
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const d = payload[0]?.payload as ChartDataPoint | undefined;
              if (!d) return null;
              return (
                <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
                  <p className="font-medium text-foreground mb-1.5">{d.date}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
                    <span>Open</span>
                    <span className="text-foreground tabular-nums text-right">
                      ${formatPrice(d.open)}
                    </span>
                    <span>High</span>
                    <span className="text-foreground tabular-nums text-right">
                      ${formatPrice(d.high)}
                    </span>
                    <span>Low</span>
                    <span className="text-foreground tabular-nums text-right">
                      ${formatPrice(d.low)}
                    </span>
                    <span>Close</span>
                    <span className="text-foreground tabular-nums text-right">
                      ${formatPrice(d.close)}
                    </span>
                    <span>Volume</span>
                    <span className="text-foreground tabular-nums text-right">
                      {formatVolume(d.volume)}
                    </span>
                    {d.sma50 != null && (
                      <>
                        <span>50 SMA</span>
                        <span className="text-foreground tabular-nums text-right">
                          ${formatPrice(d.sma50)}
                        </span>
                      </>
                    )}
                    {d.sma200 != null && (
                      <>
                        <span>200 SMA</span>
                        <span className="text-foreground tabular-nums text-right">
                          ${formatPrice(d.sma200)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            }}
          />

          {/* Volume bars */}
          {!compact && (
            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill="hsl(var(--muted-foreground))"
              opacity={0.15}
              isAnimationActive={false}
            />
          )}

          {/* Price - Area or Line */}
          {chartType === "area" ? (
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.1}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          ) : (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          )}

          {/* Moving averages */}
          {!compact && showSMA50 && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="sma50"
              stroke="#f59e0b"
              strokeWidth={1}
              strokeDasharray="4 2"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          {!compact && showSMA200 && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="sma200"
              stroke="#ef4444"
              strokeWidth={1}
              strokeDasharray="4 2"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}

          {/* Brush for zoom/pan */}
          {!compact && (
            <Brush
              dataKey="date"
              height={30}
              stroke="hsl(var(--border))"
              fill="hsl(var(--secondary))"
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return d.toLocaleDateString("en-US", {
                  month: "short",
                  year: "2-digit",
                });
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      {!compact && (
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-primary rounded" />
            <span>Close</span>
          </div>
          {showSMA50 && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-0.5 rounded"
                style={{ backgroundColor: "#f59e0b" }}
              />
              <span>50 SMA</span>
            </div>
          )}
          {showSMA200 && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-0.5 rounded"
                style={{ backgroundColor: "#ef4444" }}
              />
              <span>200 SMA</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 bg-muted-foreground/20 rounded-sm" />
            <span>Volume</span>
          </div>
        </div>
      )}
    </div>
  );
}
