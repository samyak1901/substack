import { useState } from "react";
import type { StockProfile } from "../../types";
import FinancialsTable from "../research/financials-table";
import BalanceSheetTable from "./balance-sheet-table";
import FinancialsTrendChart from "./financials-trend-chart";
import { useQuarterlyFinancials } from "../../hooks/use-quarterly";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

type Statement = "income" | "balance" | "cashflow";
type Period = "annual" | "quarterly";

export default function FinancialsSection({
  profile,
}: {
  profile: StockProfile;
}) {
  const [statement, setStatement] = useState<Statement>("income");
  const [period, setPeriod] = useState<Period>("annual");

  const ticker = profile.ticker;
  const { data: quarterly, isLoading: qLoading } = useQuarterlyFinancials(
    ticker,
    period === "quarterly",
  );

  // Annual data
  const annualFinancials =
    profile.research?.financials ?? profile.overview?.financials ?? null;
  const balanceSheet = profile.overview?.balance_sheet ?? [];

  // Quarterly data
  const quarterlyIncome = quarterly?.income_cashflow ?? [];
  const quarterlyBalance = quarterly?.balance_sheet ?? [];

  const showTrend =
    statement === "income" &&
    period === "annual" &&
    annualFinancials?.years?.length;

  const STATEMENTS: { key: Statement; label: string }[] = [
    { key: "income", label: "Income Statement" },
    { key: "balance", label: "Balance Sheet" },
    { key: "cashflow", label: "Cash Flow" },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
          {STATEMENTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatement(s.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                statement === s.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
          <button
            onClick={() => setPeriod("annual")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              period === "annual"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Annual
          </button>
          <button
            onClick={() => setPeriod("quarterly")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              period === "quarterly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Quarterly
          </button>
        </div>
      </div>

      {/* Trend chart */}
      {showTrend && annualFinancials?.years && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Revenue & Profitability Trend
          </h3>
          <FinancialsTrendChart years={annualFinancials.years} />
        </div>
      )}

      {/* Loading quarterly */}
      {period === "quarterly" && qLoading && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">
            Loading quarterly data...
          </p>
        </div>
      )}

      {/* Annual Income / Cash Flow */}
      {period === "annual" && (statement === "income" || statement === "cashflow") && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {statement === "income" ? "Income Statement" : "Cash Flow Statement"}{" "}
            (5 Year)
          </h3>
          {annualFinancials?.years?.length ? (
            <FinancialsTable years={annualFinancials.years} />
          ) : (
            <p className="text-muted-foreground text-sm text-center py-6">
              No financial data available.
            </p>
          )}
        </div>
      )}

      {/* Annual Balance Sheet */}
      {period === "annual" && statement === "balance" && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Balance Sheet (5 Year)
          </h3>
          {balanceSheet.length ? (
            <BalanceSheetTable years={balanceSheet} />
          ) : (
            <p className="text-muted-foreground text-sm text-center py-6">
              No balance sheet data available.
            </p>
          )}
        </div>
      )}

      {/* Quarterly Income / Cash Flow */}
      {period === "quarterly" &&
        !qLoading &&
        (statement === "income" || statement === "cashflow") && (
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {statement === "income" ? "Income Statement" : "Cash Flow Statement"}{" "}
              (Quarterly)
            </h3>
            {quarterlyIncome.length ? (
              <QuarterlyTable data={quarterlyIncome} type={statement} />
            ) : (
              <p className="text-muted-foreground text-sm text-center py-6">
                No quarterly data available.
              </p>
            )}
          </div>
        )}

      {/* Quarterly Balance Sheet */}
      {period === "quarterly" && !qLoading && statement === "balance" && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Balance Sheet (Quarterly)
          </h3>
          {quarterlyBalance.length ? (
            <QuarterlyBalanceTable data={quarterlyBalance} />
          ) : (
            <p className="text-muted-foreground text-sm text-center py-6">
              No quarterly balance sheet data available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function fmtNum(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

function fmtEps(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return `$${val.toFixed(2)}`;
}

function QuarterlyTable({
  data,
  type,
}: {
  data: { year: string; period: string; revenue?: number | null; ebitda?: number | null; ebit?: number | null; net_income?: number | null; eps?: number | null; fcf?: number | null; operating_cf?: number | null }[];
  type: "income" | "cashflow";
}) {
  const rows =
    type === "income"
      ? [
          { label: "Revenue", key: "revenue" as const, fmt: fmtNum, bold: true },
          { label: "EBITDA", key: "ebitda" as const, fmt: fmtNum, bold: false },
          { label: "EBIT", key: "ebit" as const, fmt: fmtNum, bold: false },
          { label: "Net Income", key: "net_income" as const, fmt: fmtNum, bold: false },
          { label: "EPS", key: "eps" as const, fmt: fmtEps, bold: true },
        ]
      : [
          { label: "Operating CF", key: "operating_cf" as const, fmt: fmtNum, bold: true },
          { label: "FCF", key: "fcf" as const, fmt: fmtNum, bold: true },
        ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground w-32">
              Metric
            </th>
            {data.map((q, i) => (
              <th
                key={i}
                className="text-right pb-2 px-2 font-medium text-muted-foreground min-w-[70px]"
              >
                {q.period} {q.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row) => (
            <tr key={row.label} className="hover:bg-secondary/30">
              <td className={`py-2 pr-4 text-foreground ${row.bold ? "font-semibold" : ""}`}>
                {row.label}
              </td>
              {data.map((q, i) => {
                const val = q[row.key];
                return (
                  <td
                    key={i}
                    className={`py-2 px-2 text-right tabular-nums ${
                      row.bold ? "font-semibold text-foreground" : "text-foreground/80"
                    } ${val != null && val < 0 ? "text-rose-500" : ""}`}
                  >
                    {row.fmt(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuarterlyBalanceTable({
  data,
}: {
  data: { year: string; period: string; total_assets?: number | null; total_liabilities?: number | null; total_equity?: number | null; total_debt?: number | null; net_debt?: number | null; cash?: number | null }[];
}) {
  const rows = [
    { label: "Total Assets", key: "total_assets" as const, bold: true },
    { label: "Total Liabilities", key: "total_liabilities" as const, bold: false },
    { label: "Equity", key: "total_equity" as const, bold: true },
    { label: "Total Debt", key: "total_debt" as const, bold: false },
    { label: "Net Debt", key: "net_debt" as const, bold: false },
    { label: "Cash", key: "cash" as const, bold: false },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground w-32">
              Metric
            </th>
            {data.map((q, i) => (
              <th
                key={i}
                className="text-right pb-2 px-2 font-medium text-muted-foreground min-w-[70px]"
              >
                {q.period} {q.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row) => (
            <tr key={row.label} className="hover:bg-secondary/30">
              <td className={`py-2 pr-4 text-foreground ${row.bold ? "font-semibold" : ""}`}>
                {row.label}
              </td>
              {data.map((q, i) => (
                <td
                  key={i}
                  className={`py-2 px-2 text-right tabular-nums ${
                    row.bold ? "font-semibold text-foreground" : "text-foreground/80"
                  }`}
                >
                  {fmtNum(q[row.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
