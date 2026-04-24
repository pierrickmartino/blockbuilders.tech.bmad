"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ZoomableChart } from "@/components/ZoomableChart";
import { BacktestSummary } from "@/types/backtest";
import { formatChartDate, formatDateTime, formatPercent, type TimezoneMode } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";

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
  tickConfig,
}: DrawdownSectionProps) {
  const isMobile = useIsMobile();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div className="space-y-1">
          <h2 className="text-[15px] font-semibold">Drawdown</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Peak-to-trough equity decline
            {isMobile && " (Pinch to zoom)"}
          </p>
        </div>
        {summary && (
          <div className="flex items-center gap-3.5">
            <div className="text-right">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Max DD
              </div>
              <div className="font-mono text-sm font-semibold text-destructive">
                {formatPercent(summary.max_drawdown_pct)}
              </div>
            </div>
            <div className="h-7 w-px bg-border" />
            <div className="text-right">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
      <div>
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
          <div className="h-44 sm:h-56">
            <ZoomableChart>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={drawdownData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(v) => formatChartDate(v, timezone)}
                    tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickCount={tickConfig.xAxisTicks}
                  />
                  <YAxis
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                    tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    width={45}
                    tickCount={tickConfig.yAxisTicks}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(2)}%`, "Drawdown"]}
                    labelFormatter={(label) => formatDateTime(label as string, timezone)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.25rem",
                      fontSize: "0.75rem",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  {drawdownData.some((d) => d.isMaxDrawdown) && (
                    <ReferenceArea
                      x1={drawdownData.find((d) => d.isMaxDrawdown)?.timestamp}
                      x2={drawdownData.filter((d) => d.isMaxDrawdown).pop()?.timestamp}
                      fill="hsl(var(--destructive))"
                      fillOpacity={0.2}
                      strokeOpacity={0}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="drawdown"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={1.5}
                    fill="url(#drawdownGradient)"
                    dot={false}
                    activeDot={{ r: 3, fill: "hsl(var(--destructive))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ZoomableChart>
          </div>
        )}
      </div>
    </div>
  );
}
