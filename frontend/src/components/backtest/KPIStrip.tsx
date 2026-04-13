"use client";

import { BacktestSummary, TradeDetail } from "@/types/backtest";
import { formatPercent, formatDuration } from "@/lib/format";
import { TrendingUp, Activity, TrendingDown, Target, Repeat, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PositionStats {
  avgHoldSeconds: number;
}

interface KPIStripProps {
  summary: BacktestSummary;
  trades: TradeDetail[];
  positionStats: PositionStats | null;
}

interface KPICardProps {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  valueColor?: string;
}

function KPICard({ label, value, subtitle, icon, valueColor }: KPICardProps) {
  return (
    <div className="rounded border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon}
      </div>
      <div className={cn("mt-2 font-mono text-2xl font-bold sm:text-[26px]", valueColor)}>
        {value}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{subtitle}</div>
    </div>
  );
}

export function KPIStrip({ summary, trades, positionStats }: KPIStripProps) {
  const totalReturn = summary.total_return_pct;
  const isPositiveReturn = totalReturn >= 0;
  const wins = Math.round((summary.win_rate_pct / 100) * summary.num_trades);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <KPICard
        label="Total return"
        value={`${isPositiveReturn ? "+" : ""}${formatPercent(totalReturn)}`}
        subtitle={`vs B&H ${summary.benchmark_return_pct >= 0 ? "+" : ""}${formatPercent(summary.benchmark_return_pct)}`}
        icon={<TrendingUp className={cn("h-3.5 w-3.5", isPositiveReturn ? "text-success" : "text-destructive")} />}
        valueColor={isPositiveReturn ? "text-success" : "text-destructive"}
      />
      <KPICard
        label="Sharpe ratio"
        value={summary.sharpe_ratio.toFixed(2)}
        subtitle={`Sortino ${summary.sortino_ratio.toFixed(2)} · Calmar ${summary.calmar_ratio.toFixed(2)}`}
        icon={<Activity className="h-3.5 w-3.5 text-primary" />}
      />
      <KPICard
        label="Max drawdown"
        value={`${formatPercent(summary.max_drawdown_pct)}`}
        subtitle={`${summary.max_consecutive_losses} max consec. losses`}
        icon={<TrendingDown className="h-3.5 w-3.5 text-destructive" />}
        valueColor="text-destructive"
      />
      <KPICard
        label="Win rate"
        value={`${formatPercent(summary.win_rate_pct)}`}
        subtitle={`${wins} wins / ${summary.num_trades} total`}
        icon={<Target className="h-3.5 w-3.5 text-primary" />}
      />
      <KPICard
        label="Total trades"
        value={String(summary.num_trades)}
        subtitle={trades.length > 0 ? `${Math.round(summary.num_trades / Math.max(1, Math.ceil((new Date(trades[trades.length - 1]?.exit_time).getTime() - new Date(trades[0]?.entry_time).getTime()) / (30 * 86400000))))} per month` : "—"}
        icon={<Repeat className="h-3.5 w-3.5 text-muted-foreground" />}
      />
      <KPICard
        label="Avg hold"
        value={positionStats ? formatDuration(positionStats.avgHoldSeconds) : "—"}
        subtitle={positionStats ? `${(positionStats.avgHoldSeconds / 86400).toFixed(1)}d` : "—"}
        icon={<Clock3 className="h-3.5 w-3.5 text-muted-foreground" />}
      />
    </div>
  );
}
