"use client";

import type { ReactNode } from "react";
import { BacktestSummary } from "@/types/backtest";
import { formatNumber, formatPercent } from "@/lib/format";
import {
  TrendingDown,
  DollarSign,
  Zap,
  Activity,
  BarChart2,
  ArrowRight,
  Minus,
} from "lucide-react";


interface TransactionCostAnalysisProps {
  summary: BacktestSummary;
}

export function TransactionCostAnalysis({ summary }: TransactionCostAnalysisProps) {
  const hasCostData = summary.total_costs_usd !== undefined && summary.total_costs_usd !== null;

  if (!hasCostData) {
    return (
      <section className="rounded border bg-card p-6">
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
          Transaction cost analysis
        </h2>
        <p className="text-sm text-muted-foreground">
          Cost breakdown not available for this backtest run. Run a new backtest to see detailed
          transaction costs.
        </p>
      </section>
    );
  }

  const fees = summary.total_fees_usd ?? 0;
  const slippage = summary.total_slippage_usd ?? 0;
  const spread = summary.total_spread_usd ?? 0;
  const total = summary.total_costs_usd ?? 0;
  const avgPerTrade = summary.avg_cost_per_trade_usd ?? 0;
  const grossReturn = summary.gross_return_usd ?? 0;
  const netReturn = summary.final_balance - summary.initial_balance;
  const numTrades = summary.num_trades;

  const feesPct = total > 0 ? (fees / total) * 100 : 0;
  const slippagePct = total > 0 ? (slippage / total) * 100 : 0;
  const spreadPct = total > 0 ? (spread / total) * 100 : 0;

  return (
    <section className="rounded border border-border bg-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Transaction cost analysis</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            What the strategy pays to trade · {numTrades} fills
          </p>
        </div>
        {summary.cost_pct_gross_return != null && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-destructive/60 px-2.5 py-1 text-xs font-medium text-destructive">
            <TrendingDown className="h-3.5 w-3.5" />
            <span>{formatPercent(summary.cost_pct_gross_return)} cost drag</span>
          </div>
        )}
      </div>

      <div className="my-4 border-t border-border" />

      {/* 4 metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="FEES"
          icon={<DollarSign className="h-3.5 w-3.5 text-muted-foreground/60" />}
          value={formatNumber(fees, 2)}
          sub={`${formatNumber(feesPct, 1)}% of costs`}
        />
        <MetricCard
          label="SLIPPAGE"
          icon={<Zap className="h-3.5 w-3.5 text-muted-foreground/60" />}
          value={formatNumber(slippage, 2)}
          sub={`${formatNumber(slippagePct, 1)}% of costs`}
        />
        <MetricCard
          label="SPREAD"
          icon={<Activity className="h-3.5 w-3.5 text-muted-foreground/60" />}
          value={formatNumber(spread, 2)}
          sub={`${formatNumber(spreadPct, 1)}% of costs`}
        />
        <MetricCard
          label="AVG PER TRADE"
          icon={<BarChart2 className="h-3.5 w-3.5 text-muted-foreground/60" />}
          value={formatNumber(avgPerTrade, 2)}
          sub={`across ${numTrades} fills`}
        />
      </div>

      {/* Cost breakdown */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Cost breakdown
          </span>
          <span className="text-xs text-muted-foreground">
            Total{" "}
            <span className="font-semibold text-foreground">{formatNumber(total, 2)} USDT</span>
          </span>
        </div>

        {/* Stacked bar */}
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="bg-destructive transition-all" style={{ width: `${feesPct}%` }} />
          <div className="bg-warning transition-all" style={{ width: `${slippagePct}%` }} />
          <div
            className="bg-slate-400 transition-all dark:bg-slate-500"
            style={{ width: `${spreadPct}%` }}
          />
        </div>

        {/* Legend */}
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          <LegendDot colorClass="bg-destructive" label={`Fees ${formatNumber(feesPct, 1)}%`} />
          <LegendDot colorClass="bg-warning" label={`Slippage ${formatNumber(slippagePct, 1)}%`} />
          <LegendDot
            colorClass="bg-slate-400 dark:bg-slate-500"
            label={`Spread ${formatNumber(spreadPct, 1)}%`}
          />
        </div>
      </div>

      {/* Bottom summary: Gross → Costs → Net */}
      <div className="mt-5 grid grid-cols-3 divide-x divide-border rounded-lg border border-border">
        <div className="px-4 py-3 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Gross return
          </div>
          <div className="mt-1.5 flex items-baseline justify-center gap-1">
            <span
              className={`text-xl font-bold leading-tight ${grossReturn >= 0 ? "text-success" : "text-destructive"}`}
            >
              {grossReturn >= 0 ? "+" : "-"}
              {formatNumber(Math.abs(grossReturn), 2)}
            </span>
            <span className="text-xs text-muted-foreground">USDT</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-destructive">
            Costs
          </div>
          <div className="mt-1.5 flex items-baseline justify-center gap-1">
            <Minus className="h-3 w-3 text-destructive" />
            <span className="text-xl font-semibold text-destructive">{formatNumber(total, 2)}</span>
            <span className="text-xs text-muted-foreground">USDT</span>
          </div>
        </div>
        <div className="px-4 py-3 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Net return
          </div>
          <div className="mt-1.5 flex items-baseline justify-center gap-1">
            <span
              className={`text-xl font-bold leading-tight ${netReturn >= 0 ? "text-success" : "text-destructive"}`}
            >
              {netReturn >= 0 ? "+" : "-"}
              {formatNumber(Math.abs(netReturn), 2)}
            </span>
            <span className="text-xs text-muted-foreground">USDT</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  icon,
  value,
  sub,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  sub: string;
}) {
  return (
    <div className="relative rounded-lg border border-border bg-muted/30 p-3">
      <div className="absolute right-2.5 top-2.5">{icon}</div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-xl font-bold leading-tight text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">USDT</span>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function LegendDot({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <div className={`h-2 w-2 rounded-full ${colorClass}`} />
      <span>{label}</span>
    </div>
  );
}
