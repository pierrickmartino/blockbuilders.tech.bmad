"use client";

import { BacktestSummary, TradeDetail } from "@/types/backtest";
import { formatPercent, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PositionStats {
  avgHoldSeconds: number;
}

interface KPIStripProps {
  summary: BacktestSummary;
  trades: TradeDetail[];
  positionStats: PositionStats | null;
}

interface PrimaryTileProps {
  label: string;
  value: string;
  subtitle: string;
  valueColor?: string;
}

function PrimaryTile({ label, value, subtitle, valueColor }: PrimaryTileProps) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-3 font-mono text-3xl font-bold leading-none tabular-nums sm:text-[34px]", valueColor)}>
        {value}
      </div>
      <div className="mt-2 font-mono text-[11px] text-muted-foreground">{subtitle}</div>
    </div>
  );
}

interface SecondaryTileProps {
  label: string;
  value: string;
  subtitle: string;
}

function SecondaryTile({ label, value, subtitle }: SecondaryTileProps) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-mono text-lg font-semibold leading-none tabular-nums">{value}</span>
        <span className="font-mono text-[11px] text-muted-foreground">{subtitle}</span>
      </div>
    </div>
  );
}

export function KPIStrip({ summary, trades, positionStats }: KPIStripProps) {
  const totalReturn = summary.total_return_pct;
  const isPositiveReturn = totalReturn >= 0;
  const wins = Math.round((summary.win_rate_pct / 100) * summary.num_trades);

  const tradesPerMonth =
    trades.length > 0
      ? Math.round(
          summary.num_trades /
            Math.max(
              1,
              Math.ceil(
                (new Date(trades[trades.length - 1]?.exit_time).getTime() -
                  new Date(trades[0]?.entry_time).getTime()) /
                  (30 * 86400000),
              ),
            ),
        )
      : null;

  return (
    <section
      aria-label="Key performance indicators"
      className="-mx-4 border-y border-border px-4 py-6 sm:-mx-8 sm:px-8 sm:py-7"
    >
      {/* Primary row: the headline triad */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <PrimaryTile
          label="Total return"
          value={`${isPositiveReturn ? "+" : ""}${formatPercent(totalReturn)}`}
          subtitle={`vs B&H ${summary.benchmark_return_pct >= 0 ? "+" : ""}${formatPercent(summary.benchmark_return_pct)}`}
          valueColor={isPositiveReturn ? "text-success" : "text-destructive"}
        />
        <PrimaryTile
          label="Sharpe ratio"
          value={summary.sharpe_ratio.toFixed(2)}
          subtitle={`Sortino ${summary.sortino_ratio.toFixed(2)} · Calmar ${summary.calmar_ratio.toFixed(2)}`}
        />
        <PrimaryTile
          label="Max drawdown"
          value={formatPercent(summary.max_drawdown_pct)}
          subtitle={`${summary.max_consecutive_losses} max consec. losses`}
          valueColor="text-destructive"
        />
      </div>

      {/* Secondary row: supporting metrics */}
      <div className="mt-7 grid grid-cols-3 gap-6 border-t border-border/60 pt-5">
        <SecondaryTile
          label="Win rate"
          value={formatPercent(summary.win_rate_pct)}
          subtitle={`${wins}/${summary.num_trades}`}
        />
        <SecondaryTile
          label="Trades"
          value={String(summary.num_trades)}
          subtitle={tradesPerMonth != null ? `${tradesPerMonth}/mo` : "—"}
        />
        <SecondaryTile
          label="Avg hold"
          value={positionStats ? formatDuration(positionStats.avgHoldSeconds) : "—"}
          subtitle={positionStats ? `${(positionStats.avgHoldSeconds / 86400).toFixed(1)}d` : "—"}
        />
      </div>
    </section>
  );
}
