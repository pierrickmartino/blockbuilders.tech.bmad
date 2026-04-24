"use client";

import { ReactNode } from "react";
import { BacktestSummary, TradeDetail } from "@/types/backtest";
import { formatPercent, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import InfoIcon from "@/components/InfoIcon";
import { getTooltip } from "@/lib/tooltip-content";

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
  tooltipId?: string;
  value: string;
  subtitle: ReactNode;
  valueColor?: string;
}

function PrimaryTile({ label, tooltipId, value, subtitle, valueColor }: PrimaryTileProps) {
  const tooltip = tooltipId ? getTooltip(tooltipId) : undefined;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {tooltip && <InfoIcon tooltip={tooltip} className="text-[0.75rem] opacity-70" />}
      </div>
      <div className={cn("mt-3 font-mono text-3xl font-bold leading-none tabular-nums sm:text-[34px]", valueColor)}>
        {value}
      </div>
      <div className="mt-2 font-mono text-[11px] text-muted-foreground">{subtitle}</div>
    </div>
  );
}

interface InlineMetricProps {
  name: string;
  value: string;
  tooltipId: string;
}

function InlineMetric({ name, value, tooltipId }: InlineMetricProps) {
  const tooltip = getTooltip(tooltipId);
  return (
    <span className="inline-flex items-center gap-1">
      <span>{name}</span>
      {tooltip && <InfoIcon tooltip={tooltip} className="text-[0.7rem] opacity-70" />}
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

interface SecondaryTileProps {
  label: string;
  tooltipId?: string;
  value: string;
  subtitle: string;
}

function SecondaryTile({ label, tooltipId, value, subtitle }: SecondaryTileProps) {
  const tooltip = tooltipId ? getTooltip(tooltipId) : undefined;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {tooltip && <InfoIcon tooltip={tooltip} className="text-[0.7rem] opacity-70" />}
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
      className="-mx-4 border-t border-border px-4 py-6 sm:-mx-8 sm:px-8 sm:py-7"
    >
      {/* Primary row: the headline triad */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <PrimaryTile
          label="Total return"
          tooltipId="metric-total-return"
          value={`${isPositiveReturn ? "+" : ""}${formatPercent(totalReturn)}`}
          subtitle={
            <span>
              vs B&amp;H{" "}
              {`${summary.benchmark_return_pct >= 0 ? "+" : ""}${formatPercent(summary.benchmark_return_pct)}`}
            </span>
          }
          valueColor={isPositiveReturn ? "text-success" : "text-destructive"}
        />
        <PrimaryTile
          label="Sharpe ratio"
          tooltipId="metric-sharpe"
          value={summary.sharpe_ratio.toFixed(2)}
          subtitle={
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              <InlineMetric name="Sortino" tooltipId="metric-sortino" value={summary.sortino_ratio.toFixed(2)} />
              <span aria-hidden="true">·</span>
              <InlineMetric name="Calmar" tooltipId="metric-calmar" value={summary.calmar_ratio.toFixed(2)} />
            </span>
          }
        />
        <PrimaryTile
          label="Max drawdown"
          tooltipId="metric-max-drawdown"
          value={formatPercent(summary.max_drawdown_pct)}
          subtitle={`${summary.max_consecutive_losses} max consec. losses`}
          valueColor="text-destructive"
        />
      </div>

      {/* Secondary row: supporting metrics */}
      <div className="mt-7 grid grid-cols-3 gap-6 border-t border-border/60 pt-5">
        <SecondaryTile
          label="Win rate"
          tooltipId="metric-win-rate"
          value={formatPercent(summary.win_rate_pct)}
          subtitle={`${wins}/${summary.num_trades}`}
        />
        <SecondaryTile
          label="Trades"
          tooltipId="metric-trades"
          value={String(summary.num_trades)}
          subtitle={tradesPerMonth != null ? `${tradesPerMonth}/mo` : "—"}
        />
        <SecondaryTile
          label="Avg hold"
          tooltipId="metric-avg-hold"
          value={positionStats ? formatDuration(positionStats.avgHoldSeconds) : "—"}
          subtitle={positionStats ? `${(positionStats.avgHoldSeconds / 86400).toFixed(1)}d` : "—"}
        />
      </div>
    </section>
  );
}
