"use client";

import { AreaChart, Card } from "@tremor/react";
import { Button } from "@/components/ui/button";
import { BacktestSummary } from "@/types/backtest";
import { formatChartDate, formatPercent, type TimezoneMode } from "@/lib/format";

interface DrawdownDataPoint {
  timestamp: string;
  drawdown: number;
  isMaxDrawdown: boolean;
}

interface DrawdownSectionProps {
  drawdownData: DrawdownDataPoint[];
  summary: BacktestSummary | null | undefined;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  timezone: TimezoneMode;
  tickConfig: { xAxisTicks?: number; yAxisTicks?: number };
}

export function DrawdownSection({
  drawdownData,
  summary,
  isLoading,
  error,
  onRetry,
  timezone,
}: DrawdownSectionProps) {
  return (
    <Card className="!p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
        <div className="space-y-1">
          <h2 className="text-[15px] font-semibold">Drawdown</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Peak-to-trough equity decline
          </p>
        </div>
        {summary && (
          <div className="flex items-center gap-3.5">
            <div className="text-right">
              <div className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Max DD
              </div>
              <div className="font-mono text-sm font-semibold text-destructive">
                {formatPercent(summary.max_drawdown_pct)}
              </div>
            </div>
            <div className="h-7 w-px bg-border" />
            <div className="text-right">
              <div className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Consec. losses
              </div>
              <div className="font-mono text-sm font-semibold">
                {summary.max_consecutive_losses}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-5 sm:px-5">
        {isLoading ? (
          <div className="flex h-56 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading drawdown data...</p>
          </div>
        ) : error ? (
          <div className="flex h-56 items-center justify-center rounded border border-destructive/30 bg-destructive/5">
            <div className="text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="link" size="sm" onClick={onRetry} className="mt-2">
                Retry
              </Button>
            </div>
          </div>
        ) : drawdownData.length < 2 ? (
          <div className="flex h-56 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Not enough data to display drawdown chart
            </p>
          </div>
        ) : (
          <AreaChart
            data={drawdownData.map((d) => ({
              ...d,
              timestamp: formatChartDate(d.timestamp, timezone),
            }))}
            index="timestamp"
            categories={["drawdown"]}
            colors={["red"]}
            valueFormatter={(v) => `${v.toFixed(2)}%`}
            showLegend={false}
            showGridLines={false}
            className="h-44 sm:h-56"
          />
        )}
      </div>
    </Card>
  );
}
