import type { BalanceSheetYear } from "../../types";

function fmtNum(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

function fmtPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

interface Row {
  label: string;
  values: string[];
  bold?: boolean;
}

export default function BalanceSheetTable({
  years,
}: {
  years: BalanceSheetYear[];
}) {
  const rows: Row[] = [
    {
      label: "Total Assets",
      values: years.map((y) => fmtNum(y.total_assets)),
      bold: true,
    },
    {
      label: "Total Liabilities",
      values: years.map((y) => fmtNum(y.total_liabilities)),
    },
    {
      label: "Stockholders' Equity",
      values: years.map((y) => fmtNum(y.total_equity)),
      bold: true,
    },
    {
      label: "Total Debt",
      values: years.map((y) => fmtNum(y.total_debt)),
    },
    {
      label: "Net Debt",
      values: years.map((y) => fmtNum(y.net_debt)),
    },
    {
      label: "Cash & Equivalents",
      values: years.map((y) => fmtNum(y.cash)),
    },
    {
      label: "Debt / Assets",
      values: years.map((y) =>
        y.total_debt != null && y.total_assets != null && y.total_assets !== 0
          ? fmtPct(y.total_debt / y.total_assets)
          : "—",
      ),
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground w-40">
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
