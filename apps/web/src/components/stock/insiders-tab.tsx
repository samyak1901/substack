import { ShieldCheck } from "lucide-react";
import type { StockProfile } from "../../types";

export default function InsidersTab({ profile }: { profile: StockProfile }) {
  const research = profile.research;
  const hasInsiders = research?.insider_activity && research.insider_activity.length > 0;
  const hasSuperinvestors =
    research?.superinvestors && research.superinvestors.length > 0;

  if (!hasInsiders && !hasSuperinvestors) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground text-sm">
          No insider data available. Generate a research template to unlock
          insider transactions and superinvestor ownership.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Insider Activity */}
      {hasInsiders && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Recent Insider Activity
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">
                    Insider
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">
                    Transaction
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">Date</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">
                    Shares
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {research!.insider_activity!.map((tx, i) => (
                  <tr key={i}>
                    <td className="py-2 text-foreground">
                      {tx.insider}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({tx.relation})
                      </span>
                    </td>
                    <td className="py-2">
                      <span
                        className={
                          tx.transaction.toLowerCase().includes("buy") ||
                          tx.transaction.toLowerCase().includes("purchase")
                            ? "text-emerald-600"
                            : tx.transaction.toLowerCase().includes("sale") ||
                                tx.transaction.toLowerCase().includes("sell")
                              ? "text-rose-600"
                              : "text-foreground"
                        }
                      >
                        {tx.transaction}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">{tx.date}</td>
                    <td className="py-2 text-right text-foreground tabular-nums">
                      {tx.shares}
                    </td>
                    <td className="py-2 text-right text-foreground tabular-nums">
                      {tx.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Superinvestors */}
      {hasSuperinvestors && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Superinvestor Ownership (Dataroma)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">
                    Manager
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">
                    % of Portfolio
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">
                    Activity
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">
                    Reported Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {research!.superinvestors!.map((si, i) => (
                  <tr key={i}>
                    <td className="py-2 font-medium text-foreground">
                      {si.manager}
                    </td>
                    <td className="py-2 text-foreground tabular-nums">
                      {si.pct_of_portfolio}
                    </td>
                    <td className="py-2">
                      <span
                        className={
                          si.activity.toLowerCase().includes("buy") ||
                          si.activity.toLowerCase().includes("add")
                            ? "text-emerald-600"
                            : si.activity.toLowerCase().includes("sell") ||
                                si.activity.toLowerCase().includes("reduce")
                              ? "text-rose-600"
                              : "text-muted-foreground"
                        }
                      >
                        {si.activity || "—"}
                      </span>
                    </td>
                    <td className="py-2 text-right text-foreground tabular-nums">
                      {si.reported_price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
