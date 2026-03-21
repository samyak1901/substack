import type { FinancialYear } from "../../types";

function fmtNum(val: number | null | undefined, decimals = 0): string {
  if (val === null || val === undefined) return "—";
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(decimals || 1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(decimals || 1)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(decimals || 1)}K`;
  return `$${val.toFixed(decimals)}`;
}

function fmtPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

function fmtDso(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return val.toFixed(1);
}

function fmtEps(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return `$${val.toFixed(2)}`;
}

interface Row {
  label: string;
  values: string[];
  bold?: boolean;
}

export default function FinancialsTable({ years }: { years: FinancialYear[] }) {
  const rows: Row[] = [
    {
      label: "Revenue",
      values: years.map((y) => fmtNum(y.revenue)),
      bold: true,
    },
    {
      label: "EBITDA",
      values: years.map((y) => fmtNum(y.ebitda)),
    },
    {
      label: "EBITDA Margin",
      values: years.map((y) => fmtPct(y.ebitda_margin)),
    },
    {
      label: "EBIT",
      values: years.map((y) => fmtNum(y.ebit)),
    },
    {
      label: "EBIT Margin",
      values: years.map((y) => fmtPct(y.ebit_margin)),
    },
    {
      label: "Net Income",
      values: years.map((y) => fmtNum(y.net_income)),
    },
    {
      label: "Net Margin",
      values: years.map((y) => fmtPct(y.net_margin)),
    },
    {
      label: "FCF",
      values: years.map((y) => fmtNum(y.fcf)),
    },
    {
      label: "FCF Margin",
      values: years.map((y) => fmtPct(y.fcf_margin)),
    },
    {
      label: "DSO",
      values: years.map((y) => fmtDso(y.dso)),
    },
    {
      label: "EPS",
      values: years.map((y) => fmtEps(y.eps)),
      bold: true,
    },
    {
      label: "FCF / Share",
      values: years.map((y) => fmtEps(y.fcf_per_share)),
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground w-32">
              Metric
            </th>
            {years.map((y) => (
              <th
                key={y.year}
                className="text-right pb-2 px-2 font-medium text-muted-foreground min-w-[80px]"
              >
                {y.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row) => (
            <tr key={row.label} className="hover:bg-secondary/30">
              <td
                className={`py-2 pr-4 text-foreground ${row.bold ? "font-semibold" : ""}`}
              >
                {row.label}
              </td>
              {row.values.map((val, i) => (
                <td
                  key={i}
                  className={`py-2 px-2 text-right tabular-nums ${
                    row.bold
                      ? "font-semibold text-foreground"
                      : "text-foreground/80"
                  }`}
                >
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
