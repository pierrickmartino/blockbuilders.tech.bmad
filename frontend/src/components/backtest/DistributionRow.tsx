"use client";

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
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.25rem",
  fontSize: "0.75rem",
  color: "hsl(var(--popover-foreground))",
};

// Return distribution: red for negative buckets, green for positive
function getReturnBarColor(label: string): string {
  if (label.includes("-") || label.startsWith("<")) return "hsl(var(--destructive))";
  return "hsl(var(--success))";
}

export function DistributionRow({
  returnDistribution,
  durationDistribution,
  totalTrades,
  durationDistributionTotal,
  skewCallout,
}: DistributionRowProps) {
  if (returnDistribution.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Return Distribution */}
      <div className="rounded border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-[15px] font-semibold">Return distribution</h2>
            <p className="text-xs text-muted-foreground">P&L % per trade</p>
          </div>
          {skewCallout.includes("Review risk") && (
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400">
              Skewed
            </span>
          )}
        </div>
        <div className="px-4 py-5 sm:px-5">
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={returnDistribution} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  width={30}
                />
                <Tooltip
                  formatter={(value) => [
                    `${value} trades (${formatPercent((value as number / totalTrades) * 100)})`,
                    "Count",
                  ]}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {returnDistribution.map((entry, index) => (
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
        <div className="rounded border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-[15px] font-semibold">Duration distribution</h2>
              <p className="text-xs text-muted-foreground">Hold time in bars</p>
            </div>
            <span className="rounded border border-border bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground">
              {durationDistributionTotal} trades
            </span>
          </div>
          <div className="px-4 py-5 sm:px-5">
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationDistribution} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    width={30}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${value} trades (${formatPercent(durationDistributionTotal > 0 ? ((value as number) / durationDistributionTotal) * 100 : 0)})`,
                      "Count",
                    ]}
                    contentStyle={tooltipStyle}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--chart-1))"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
