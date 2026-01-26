"use client";

import { BacktestSummary } from "@/types/backtest";
import { formatMoney, formatPercent } from "@/lib/format";
import { InfoIcon } from "./InfoIcon";

interface TransactionCostAnalysisProps {
  summary: BacktestSummary;
}

export function TransactionCostAnalysis({ summary }: TransactionCostAnalysisProps) {
  // Check if cost data is available
  const hasCostData = summary.total_costs_usd !== undefined && summary.total_costs_usd !== null;

  if (!hasCostData) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-900 sm:text-lg">
          Transaction Cost Analysis
        </h2>
        <p className="text-sm text-gray-500">
          Cost breakdown not available for this backtest run. Run a new backtest to see detailed
          transaction costs.
        </p>
      </section>
    );
  }

  const costRows = [
    { label: "Fees", value: summary.total_fees_usd ?? 0, color: "text-gray-700" },
    { label: "Slippage", value: summary.total_slippage_usd ?? 0, color: "text-gray-700" },
    { label: "Spread", value: summary.total_spread_usd ?? 0, color: "text-gray-700" },
    {
      label: "Total Costs",
      value: summary.total_costs_usd ?? 0,
      color: "text-red-600 font-semibold",
    },
    {
      label: "Avg Cost Per Trade",
      value: summary.avg_cost_per_trade_usd ?? 0,
      color: "text-gray-700",
    },
  ];

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <h2 className="mb-3 text-base font-semibold text-gray-900 sm:text-lg">
        Transaction Cost Analysis
      </h2>

      {/* Cost Breakdown Table */}
      <div className="mb-4 space-y-2">
        {costRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{row.label}</span>
            <span className={row.color}>{formatMoney(row.value, "USDT", false)}</span>
          </div>
        ))}

        {/* Cost % of Gross Return */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-sm">
          <span className="flex items-center gap-1 text-gray-600">
            Cost % of Gross Return
            <InfoIcon glossaryId="cost_pct_gross_return" />
          </span>
          <span className="font-semibold text-gray-900">
            {summary.cost_pct_gross_return !== null &&
            summary.cost_pct_gross_return !== undefined
              ? formatPercent(summary.cost_pct_gross_return)
              : "N/A"}
          </span>
        </div>
      </div>

      {/* Callout: Gross → Net */}
      <div className="rounded-md bg-blue-50 p-3 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-blue-600">ℹ</span>
          <div className="text-blue-900">
            <span className="font-medium">Gross return: </span>
            {formatMoney(summary.gross_return_usd ?? 0, "USDT", true)}
            {" → "}
            <span className="font-medium">Net return: </span>
            {formatMoney(summary.final_balance - summary.initial_balance, "USDT", true)}
            {" (after costs)"}
          </div>
        </div>
      </div>
    </section>
  );
}
