"use client";

import { useState } from "react";
import { BacktestSummary } from "@/types/backtest";
import { formatNumber, formatPercent } from "@/lib/format";
import { TrendingDown, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionCostAnalysisProps {
  summary: BacktestSummary;
}

export function TransactionCostAnalysis({ summary }: TransactionCostAnalysisProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const hasCostData = summary.total_costs_usd !== undefined && summary.total_costs_usd !== null;

  if (!hasCostData) {
    return (
      <section className="rounded border border-border/60 bg-muted/30 px-5 py-3 dark:bg-card/40">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Transaction cost analysis
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
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

  const panelId = "tca-panel";
  const breakdownId = "tca-breakdown";

  const grossLabel = `${grossReturn >= 0 ? "+" : "-"}${formatNumber(Math.abs(grossReturn), 2)}`;
  const netLabel = `${netReturn >= 0 ? "+" : "-"}${formatNumber(Math.abs(netReturn), 2)}`;

  return (
    <section className="rounded border border-border/60 bg-muted/30 dark:bg-card/40">
      {/* Header — reference tier toggle */}
      <div className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          className="-mx-2 flex items-center gap-2 rounded px-2 py-1 text-left transition hover:bg-muted/40"
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              isExpanded ? "rotate-0" : "-rotate-90"
            )}
          />
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Transaction cost analysis
          </h2>
          <span className="font-mono text-[11px] text-muted-foreground">{numTrades} fills</span>
        </button>
        {summary.cost_pct_gross_return != null && (
          <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-destructive">
            <TrendingDown className="h-3.5 w-3.5" />
            <span>{formatPercent(summary.cost_pct_gross_return)} cost drag</span>
          </div>
        )}
      </div>

      {isExpanded && (
        <div id={panelId} className="border-t border-border/60 px-5 py-5">
          {/* Summary bar: Gross − Costs = Net, inline equation */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-sm tabular-nums">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Gross</span>
            <span className={cn("text-base font-semibold", grossReturn >= 0 ? "text-success" : "text-destructive")}>
              {grossLabel}
            </span>
            <span className="text-muted-foreground">−</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Costs</span>
            <span className="text-base font-semibold text-destructive">{formatNumber(total, 2)}</span>
            <span className="text-muted-foreground">=</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Net</span>
            <span className={cn("text-base font-semibold", netReturn >= 0 ? "text-success" : "text-destructive")}>
              {netLabel}
            </span>
            <span className="ml-auto text-[11px] text-muted-foreground">USDT</span>
          </div>

          {/* Composition bar */}
          <div className="mt-4">
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="bg-destructive" style={{ width: `${feesPct}%` }} />
              <div className="bg-warning" style={{ width: `${slippagePct}%` }} />
              <div className="bg-slate-400 dark:bg-slate-500" style={{ width: `${spreadPct}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
              <LegendDot colorClass="bg-destructive" label="Fees" pct={feesPct} />
              <LegendDot colorClass="bg-warning" label="Slippage" pct={slippagePct} />
              <LegendDot colorClass="bg-slate-400 dark:bg-slate-500" label="Spread" pct={spreadPct} />
              <span className="ml-auto">{formatNumber(avgPerTrade, 2)} avg/trade</span>
            </div>
          </div>

          {/* Drill-in: raw breakdown */}
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            aria-expanded={showBreakdown}
            aria-controls={breakdownId}
            className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn("h-3 w-3 transition-transform", showBreakdown ? "rotate-0" : "-rotate-90")}
            />
            {showBreakdown ? "Hide breakdown" : "Show breakdown"}
          </button>

          {showBreakdown && (
            <dl
              id={breakdownId}
              className="mt-3 grid grid-cols-[auto_auto_1fr] gap-x-4 gap-y-1.5 border-t border-border/60 pt-3 font-mono text-xs tabular-nums"
            >
              <BreakdownRow label="Fees" value={formatNumber(fees, 2)} hint={`${formatNumber(feesPct, 1)}% of costs`} />
              <BreakdownRow label="Slippage" value={formatNumber(slippage, 2)} hint={`${formatNumber(slippagePct, 1)}% of costs`} />
              <BreakdownRow label="Spread" value={formatNumber(spread, 2)} hint={`${formatNumber(spreadPct, 1)}% of costs`} />
            </dl>
          )}
        </div>
      )}
    </section>
  );
}

function LegendDot({ colorClass, label, pct }: { colorClass: string; label: string; pct: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", colorClass)} />
      <span>
        {label} {formatNumber(pct, 1)}%
      </span>
    </span>
  );
}

function BreakdownRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
      <dd className="text-[11px] text-muted-foreground">{hint}</dd>
    </>
  );
}
