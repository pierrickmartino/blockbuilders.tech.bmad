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
} from "recharts";
import { formatPercent } from "@/lib/format";

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

// Returns hsl color with intensity based on position in its group (neg or pos)
function getReturnBarColor(
  label: string,
  idxInGroup: number,
  groupSize: number
): string {
  // Gradient: far from zero = lightest, close to zero = darkest (for negatives)
  // Gradient: close to zero = lightest, far from zero = darkest (for positives)
  const t = groupSize > 1 ? (idxInGroup + 1) / groupSize : 1;
  if (isNegativeBucket(label)) {
    // Light pink (far) → dark red (near 0): lightness 80% → 40%
    const lightness = Math.round(80 - t * 40);
    return `hsl(0, 78%, ${lightness}%)`;
  }
  // Light green (near 0) → dark green (far): lightness 80% → 33%
  const lightness = Math.round(80 - t * 47);
  return `hsl(142, 71%, ${lightness}%)`;
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
  const negBuckets = reversedReturn.filter((b) => isNegativeBucket(b.label));
  const posBuckets = reversedReturn.filter((b) => !isNegativeBucket(b.label));

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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Return Distribution */}
      <div className="rounded border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-[15px] font-semibold">Return distribution</h2>
            <p className="text-xs text-muted-foreground">Histogram of trade P&amp;L %</p>
          </div>
          {skew !== undefined ? (
            <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-mono font-medium uppercase tracking-wide text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-400">
              SKEW {skew >= 0 ? "+" : ""}
              {skew.toFixed(2)}
            </span>
          ) : (
            skewCallout.includes("Review risk") && (
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400">
                Skewed
              </span>
            )
          )}
        </div>
        <div className="px-4 py-5 sm:px-5">
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={reversedReturn}
                margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(value) => [
                    `${value} trades (${formatPercent(((value as number) / totalTrades) * 100)})`,
                    "Count",
                  ]}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {reversedReturn.map((entry, index) => {
                    const negIdx = negBuckets.indexOf(entry);
                    const posIdx = posBuckets.indexOf(entry);
                    const isNeg = negIdx !== -1;
                    return (
                      <Cell
                        key={index}
                        fill={getReturnBarColor(
                          entry.label,
                          isNeg ? negIdx : posIdx,
                          isNeg ? negBuckets.length : posBuckets.length
                        )}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Duration Distribution */}
      {durationDistribution && (
        <div className="rounded border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-[15px] font-semibold">Duration distribution</h2>
              <p className="text-xs text-muted-foreground">Trades bucketed by hold time</p>
            </div>
            <span className="rounded border border-border bg-secondary px-2 py-1 text-[10px] font-mono font-medium uppercase tracking-wide text-muted-foreground">
              {durationDistributionTotal} TRADES
            </span>
          </div>
          <div className="px-4 py-5 sm:px-5">
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={durationDistribution}
                  margin={{ top: 5, right: 5, left: -10, bottom: 10 }}
                >
                  <XAxis
                    dataKey="label"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    tick={DurationTick as any}
                    tickLine={false}
                    axisLine={false}
                    height={50}
                  />
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
                      const intensity = entry.count / maxDurationCount;
                      const lightness = Math.round(78 - intensity * 43);
                      return (
                        <Cell
                          key={index}
                          fill={`hsl(210, 65%, ${lightness}%)`}
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
