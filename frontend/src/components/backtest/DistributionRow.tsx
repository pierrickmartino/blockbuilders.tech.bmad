"use client";

import { BarChart, Card } from "@tremor/react";
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

function isNegativeBucket(label: string): boolean {
  return label.startsWith("-") || label.startsWith("<-") || label.includes("to -");
}

export function DistributionRow({
  returnDistribution,
  durationDistribution,
  totalTrades,
  durationDistributionTotal,
  skewCallout,
  skew,
}: DistributionRowProps) {
  const reversedReturn = [...returnDistribution].reverse();
  const returnChartData = reversedReturn.map((b) => ({
    label: b.label,
    negative: isNegativeBucket(b.label) ? b.count : 0,
    positive: !isNegativeBucket(b.label) ? b.count : 0,
  }));

  if (returnDistribution.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Return Distribution */}
      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-[15px] font-semibold">Return distribution</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Histogram of trade P&amp;L %</p>
          </div>
          {skew !== undefined ? (
            <span className="rounded border border-info/40 bg-info/10 px-2 py-1 text-[10px] font-mono font-medium uppercase tracking-wide text-info">
              SKEW {skew >= 0 ? "+" : ""}
              {skew.toFixed(2)}
            </span>
          ) : (
            skewCallout.includes("Review risk") && (
              <span className="rounded border border-warning/40 bg-warning/10 px-2 py-1 text-[10px] font-medium text-warning">
                Skewed
              </span>
            )
          )}
        </div>
        <div className="px-4 py-5 sm:px-5">
          <BarChart
            data={returnChartData}
            index="label"
            categories={["negative", "positive"]}
            colors={["red", "emerald"]}
            valueFormatter={(v) =>
              `${v} (${formatPercent(totalTrades > 0 ? (v / totalTrades) * 100 : 0)})`
            }
            showLegend={false}
            showYAxis={false}
            stack
            className="h-56 sm:h-64"
          />
        </div>
      </Card>

      {/* Duration Distribution */}
      {durationDistribution && (
        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-[15px] font-semibold">Duration distribution</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Trades bucketed by hold time</p>
            </div>
            <span className="rounded border border-border bg-secondary px-2 py-1 text-[10px] font-mono font-medium uppercase tracking-wide text-muted-foreground">
              {durationDistributionTotal} TRADES
            </span>
          </div>
          <div className="px-4 py-5 sm:px-5">
            <BarChart
              data={durationDistribution}
              index="label"
              categories={["count"]}
              colors={["blue"]}
              valueFormatter={(v) =>
                `${v} (${formatPercent(
                  durationDistributionTotal > 0 ? (v / durationDistributionTotal) * 100 : 0
                )})`
              }
              showLegend={false}
              showYAxis={false}
              className="h-56 sm:h-64"
            />
          </div>
        </Card>
      )}
    </div>
  );
}
