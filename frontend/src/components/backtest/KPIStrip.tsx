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

interface StatGroupProps {
  label: string;
  value: string;
  subtitle: string;
  valueColor?: string;
  primary?: boolean;
}

function StatGroup({ label, value, subtitle, valueColor, primary }: StatGroupProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-mono tabular-nums leading-tight",
          primary ? "text-[15px] font-semibold" : "text-sm font-medium",
          valueColor
        )}
      >
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground">{subtitle}</span>
    </div>
  );
}

export function KPIStrip({ summary, trades, positionStats }: KPIStripProps) {
  const totalReturn = summary.total_return_pct;
  const isPositiveReturn = totalReturn >= 0;
  const wins = Math.round((summary.win_rate_pct / 100) * summary.num_trades);

  const monthsElapsed =
    trades.length > 0
      ? Math.max(
          1,
          Math.ceil(
            (new Date(trades[trades.length - 1].exit_time).getTime() -
              new Date(trades[0].entry_time).getTime()) /
              (30 * 86400000)
          )
        )
      : 1;

  const stats: StatGroupProps[] = [
    {
      label: "Total return",
      value: `${isPositiveReturn ? "+" : ""}${formatPercent(totalReturn)}`,
      subtitle: `vs B&H ${summary.benchmark_return_pct >= 0 ? "+" : ""}${formatPercent(summary.benchmark_return_pct)}`,
      valueColor: isPositiveReturn ? "text-success" : "text-destructive",
      primary: true,
    },
    {
      label: "Sharpe ratio",
      value: summary.sharpe_ratio.toFixed(2),
      subtitle: `Sortino ${summary.sortino_ratio.toFixed(2)} · Calmar ${summary.calmar_ratio.toFixed(2)}`,
    },
    {
      label: "Max drawdown",
      value: formatPercent(summary.max_drawdown_pct),
      subtitle: `${summary.max_consecutive_losses} max consec. losses`,
      valueColor: "text-destructive",
    },
    {
      label: "Win rate",
      value: formatPercent(summary.win_rate_pct),
      subtitle: `${wins} wins · ${summary.num_trades} total`,
    },
    {
      label: "Total trades",
      value: String(summary.num_trades),
      subtitle: trades.length > 0 ? `${Math.round(summary.num_trades / monthsElapsed)}/month` : "—",
    },
    {
      label: "Avg hold",
      value: positionStats ? formatDuration(positionStats.avgHoldSeconds) : "—",
      subtitle: "position duration",
    },
  ];

  return (
    <div className="overflow-hidden rounded border border-border bg-card">
      <div className="flex divide-x divide-border overflow-x-auto">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-[130px] flex-1 px-5 py-4">
            <StatGroup {...stat} />
          </div>
        ))}
      </div>
    </div>
  );
}
