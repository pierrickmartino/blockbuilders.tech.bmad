"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Label,
} from "recharts";
import { formatPercent } from "@/lib/format";
import InfoIcon from "@/components/InfoIcon";
import { getTooltip } from "@/lib/tooltip-content";

interface DistributionBucket {
  label: string;
  count: number;
  percentage: number;
}

interface DistributionRowProps {
  returnDistribution: DistributionBucket[];
  durationDistribution: DistributionBucket[] | null;
  totalTrades: number;
  durationDistributionTotal: number;
  skewCallout: string;
  skew?: number;
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.25rem",
  fontSize: "0.75rem",
  color: "hsl(var(--popover-foreground))",
};

function isNegativeBucket(label: string): boolean {
  return label.startsWith("-") || label.startsWith("<-") || label.includes("to -");
}

function getReturnBarColor(label: string): string {
  return isNegativeBucket(label)
    ? "hsl(var(--destructive))"
    : "hsl(var(--success))";
}

export function DistributionRow({
  returnDistribution,
  durationDistribution,
  totalTrades,
  durationDistributionTotal,
  skewCallout,
  skew,
}: DistributionRowProps) {
  // Display order: most-negative on left → most-positive on right
  const reversedReturn = [...returnDistribution].reverse();

  const maxDurationCount = durationDistribution
    ? Math.max(...durationDistribution.map((b) => b.count), 1)
    : 1;

  // Memoize the custom tick so recharts doesn't re-create it on every render
  const DurationTick = useMemo(() => {
    const data = durationDistribution ?? [];
    return function Tick({
      x,
      y,
      payload,
    }: {
      x: number;
      y: number;
      payload: { value: string };
    }) {
      const bucket = data.find((b) => b.label === payload.value);
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={0}
            dy={16}
            textAnchor="middle"
            fill="currentColor"
            fontSize={12}
            fontWeight={700}
          >
            {bucket?.count ?? ""}
          </text>
          <text
            x={0}
            y={0}
            dy={30}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            {payload.value}
          </text>
        </g>
      );
    };
  }, [durationDistribution]);

  if (returnDistribution.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
      {/* Return Distribution */}
      <div>
        <div className="flex items-center justify-between pb-4">
          <div>
            <h2 className="text-[15px] font-semibold">Return distribution</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Histogram of trade P&amp;L %</p>
          </div>
          {skew !== undefined ? (
            <span className="inline-flex items-center gap-1.5 rounded border border-info/30 bg-info/5 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-info">
              <span>
                Skew {skew >= 0 ? "+" : ""}
                {skew.toFixed(2)}
              </span>
              <InfoIcon tooltip={getTooltip("metric-skew")} className="text-[0.7rem] opacity-80" />
            </span>
          ) : (
            skewCallout.includes("Review risk") && (
              <span className="inline-flex items-center gap-1.5 rounded border border-warning/30 bg-warning/5 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-warning">
                <span>Skewed</span>
                <InfoIcon tooltip={getTooltip("metric-skew")} className="text-[0.7rem] opacity-80" />
              </span>
            )
          )}
        </div>
        <div>
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Trades per bucket
          </p>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={reversedReturn}
                margin={{ top: 5, right: 5, left: -10, bottom: 24 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                  tickLine={false}
                  axisLine={false}
                >
                  <Label
                    value="Trade return (%)"
                    position="insideBottom"
                    offset={-18}
                    style={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                      fontFamily: "var(--font-mono)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  />
                </XAxis>
                <YAxis hide />
                <Tooltip
                  formatter={(value) => [
                    `${value} trades (${formatPercent(((value as number) / totalTrades) * 100)})`,
                    "Count",
                  ]}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {reversedReturn.map((entry, index) => (
                    <Cell key={index} fill={getReturnBarColor(entry.label)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Duration Distribution */}
      {durationDistribution && (
        <div>
          <div className="flex items-center justify-between pb-4">
            <div>
              <h2 className="text-[15px] font-semibold">Duration distribution</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Trades bucketed by hold time</p>
            </div>
            <span className="rounded border border-border bg-secondary px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {durationDistributionTotal} trades
            </span>
          </div>
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Trades per bucket
            </p>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={durationDistribution}
                  margin={{ top: 5, right: 5, left: -10, bottom: 28 }}
                >
                  <XAxis
                    dataKey="label"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    tick={DurationTick as any}
                    tickLine={false}
                    axisLine={false}
                    height={68}
                  >
                    <Label
                      value="Hold time"
                      position="insideBottom"
                      offset={0}
                      style={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                        fontFamily: "var(--font-mono)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    />
                  </XAxis>
                  <YAxis hide />
                  <Tooltip
                    formatter={(value) => [
                      `${value} trades (${formatPercent(
                        durationDistributionTotal > 0
                          ? ((value as number) / durationDistributionTotal) * 100
                          : 0
                      )})`,
                      "Count",
                    ]}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {durationDistribution.map((entry, index) => {
                      const intensity =
                        maxDurationCount > 0 ? entry.count / maxDurationCount : 0;
                      return (
                        <Cell
                          key={index}
                          fill="hsl(var(--chart-duration))"
                          fillOpacity={0.45 + intensity * 0.5}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
