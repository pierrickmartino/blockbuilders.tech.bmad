import { Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/format";
import type { BacktestSummary } from "@/types/backtest";

interface SharedBacktestCostDisclosureProps {
  summary: BacktestSummary;
  feeRate: number;
  slippageRate: number;
  spreadRate: number;
}

/**
 * Cost-honesty disclosure on the public Shared backtest page (#676, ADR-0019
 * rider 5, closing ADR-0017 §6): shows the cost totals behind the broadcast
 * return alongside the rates that produced them.
 */
export function SharedBacktestCostDisclosure({
  summary,
  feeRate,
  slippageRate,
  spreadRate,
}: SharedBacktestCostDisclosureProps) {
  if (summary.total_costs_usd == null) {
    return null;
  }

  const items = [
    { label: "Fees", usd: summary.total_fees_usd, rate: feeRate },
    { label: "Slippage", usd: summary.total_slippage_usd, rate: slippageRate },
    { label: "Spread", usd: summary.total_spread_usd, rate: spreadRate },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold tracking-tight">
          <Receipt className="h-4 w-4 text-primary" aria-hidden />
          Cost Disclosure
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          This result is shown net of the trading costs disclosed below, at
          the rates used for this run.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border bg-secondary/50 p-3 dark:bg-secondary/30"
            >
              <div className="mb-1 text-xs uppercase text-muted-foreground">
                {item.label}
              </div>
              <div className="text-lg font-semibold tabular-nums tracking-tight">
                {formatNumber(item.usd, 2)} USDT
              </div>
              <div className="text-xs text-muted-foreground">
                at {formatPercent(item.rate * 100)} rate
              </div>
            </div>
          ))}
          <div className="rounded-lg border bg-secondary/50 p-3 dark:bg-secondary/30">
            <div className="mb-1 text-xs uppercase text-muted-foreground">
              Total Costs
            </div>
            <div className="text-lg font-semibold tabular-nums tracking-tight">
              {formatNumber(summary.total_costs_usd, 2)} USDT
            </div>
            {summary.cost_pct_gross_return != null && (
              <div className="text-xs text-muted-foreground">
                {formatPercent(summary.cost_pct_gross_return)} of gross return
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
