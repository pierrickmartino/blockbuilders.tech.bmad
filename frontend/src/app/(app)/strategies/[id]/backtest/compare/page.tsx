"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatPercent, formatPrice, formatChartDate } from "@/lib/format";
import { useDisplay } from "@/context/display";
import { BacktestCompareResponse } from "@/types/backtest";
import { Strategy } from "@/types/strategy";
import { StrategyTabs } from "@/components/StrategyTabs";
import { ZoomableChart } from "@/components/ZoomableChart";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  params: Promise<{ id: string }>;
}

// Colors for up to 4 runs
const RUN_COLORS = [
  "hsl(var(--chart-1))", // blue
  "hsl(var(--chart-2))", // green
  "hsl(var(--chart-3))", // orange
  "hsl(var(--chart-4))", // purple
];

export default function CompareBacktestsPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { timezone } = useDisplay();
  const isMobile = useIsMobile();

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(true);
  const [compareData, setCompareData] = useState<BacktestCompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runIds = useMemo(() => {
    const runsParam = searchParams.get("runs");
    return runsParam ? runsParam.split(",") : [];
  }, [searchParams]);

  // Load strategy
  useEffect(() => {
    const loadStrategy = async () => {
      try {
        const data = await apiFetch<Strategy>(`/strategies/${id}`);
        setStrategy(data);
      } catch (err) {
        console.error("Failed to load strategy:", err);
      } finally {
        setIsLoadingStrategy(false);
      }
    };
    loadStrategy();
  }, [id]);

  // Load comparison data
  useEffect(() => {
    const loadComparison = async () => {
      if (runIds.length < 2 || runIds.length > 4) {
        setError("Please select 2-4 backtest runs to compare.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await apiFetch<BacktestCompareResponse>("/backtests/compare", {
          method: "POST",
          body: JSON.stringify({ run_ids: runIds }),
        });
        setCompareData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load comparison data");
      } finally {
        setIsLoading(false);
      }
    };

    loadComparison();
  }, [runIds]);

  // Align equity curves by timestamp (union of all timestamps)
  const alignedChartData = useMemo(() => {
    if (!compareData) return [];

    // Collect all unique timestamps
    const timestampSet = new Set<string>();
    compareData.runs.forEach(run => {
      run.equity_curve.forEach(point => {
        timestampSet.add(point.timestamp);
      });
    });

    const allTimestamps = Array.from(timestampSet).sort();

    // Build maps for each run
    const runMaps = compareData.runs.map(run => {
      const map = new Map<string, number>();
      run.equity_curve.forEach(point => {
        map.set(point.timestamp, point.equity);
      });
      return map;
    });

    // Create aligned data
    return allTimestamps.map(timestamp => {
      const point: Record<string, string | number | null> = { timestamp };
      compareData.runs.forEach((run, idx) => {
        point[`run_${idx}`] = runMaps[idx].get(timestamp) ?? null;
      });
      return point;
    });
  }, [compareData]);

  // Metrics for comparison table. `direction` controls best-value highlighting:
  // 'higher' = max wins, 'lower' = min wins, 'none' = no winner (benchmark/beta).
  const metricsConfig: Array<{
    key: string;
    label: string;
    format: (v: number) => string;
    direction: "higher" | "lower" | "none";
  }> = [
    { key: "total_return_pct", label: "Total return", format: formatPercent, direction: "higher" },
    { key: "cagr_pct", label: "CAGR", format: formatPercent, direction: "higher" },
    { key: "max_drawdown_pct", label: "Max drawdown", format: formatPercent, direction: "higher" }, // stored as negative, so higher = less bad
    { key: "sharpe_ratio", label: "Sharpe ratio", format: (v: number) => v.toFixed(2), direction: "higher" },
    { key: "sortino_ratio", label: "Sortino ratio", format: (v: number) => v.toFixed(2), direction: "higher" },
    { key: "calmar_ratio", label: "Calmar ratio", format: (v: number) => v.toFixed(2), direction: "higher" },
    { key: "num_trades", label: "Trades", format: (v: number) => v.toString(), direction: "none" },
    { key: "win_rate_pct", label: "Win rate", format: formatPercent, direction: "higher" },
    { key: "max_consecutive_losses", label: "Max consecutive losses", format: (v: number) => v.toString(), direction: "lower" },
    { key: "benchmark_return_pct", label: "Benchmark return", format: formatPercent, direction: "none" },
    { key: "alpha", label: "Alpha", format: formatPercent, direction: "higher" },
    { key: "beta", label: "Beta", format: (v: number) => v.toFixed(2), direction: "none" },
  ];

  // Precompute the best value per metric row across all runs for highlighting.
  const bestByMetric = useMemo(() => {
    const map = new Map<string, number>();
    if (!compareData) return map;
    metricsConfig.forEach((metric) => {
      if (metric.direction === "none") return;
      const values: number[] = [];
      compareData.runs.forEach((run) => {
        const v = run.summary
          ? (run.summary as unknown as Record<string, unknown>)[metric.key]
          : null;
        if (typeof v === "number" && Number.isFinite(v)) values.push(v);
      });
      if (values.length === 0) return;
      const best = metric.direction === "higher" ? Math.max(...values) : Math.min(...values);
      map.set(metric.key, best);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareData]);

  // Short label per run, reused in legend, tooltip, and table header.
  const runLabel = (idx: number) => `Run ${idx + 1}`;
  const runDateRange = (run: BacktestCompareResponse["runs"][number]) =>
    `${formatDateTime(run.date_from, timezone).split(" ")[0]} → ${formatDateTime(run.date_to, timezone).split(" ")[0]}`;

  const tickConfig = useMemo(() => {
    if (isMobile) {
      return { xAxisTicks: 3, yAxisTicks: 4 };
    }
    return { xAxisTicks: undefined, yAxisTicks: undefined };
  }, [isMobile]);

  if (!isLoadingStrategy && !strategy) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">Strategy not found</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/strategies">Back to strategies</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-8">
      <div className="border-b border-border bg-card px-4 py-3 shadow-sm sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {isLoadingStrategy || !strategy ? (
                <>
                  <Skeleton className="h-7 w-56" />
                  <Skeleton className="mt-2 h-4 w-32" />
                </>
              ) : (
                <>
                  <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{strategy.name}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {strategy.asset} · {strategy.timeframe}
                  </p>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              Back to backtests
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <StrategyTabs strategyId={id} activeTab="backtest" />

        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4">
            <h2 className="mb-4 text-lg font-semibold tracking-tight">
              Compare Backtests
            </h2>

            {error && (
              <div className="mb-4 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/strategies/${id}/backtest`)}
                >
                  Go to backtest runs
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-6">
                <div>
                  <Skeleton className="mb-3 h-5 w-32" />
                  <Skeleton className="h-64 w-full sm:h-72 md:h-96" />
                </div>
                <div>
                  <Skeleton className="mb-3 h-5 w-40" />
                  <Skeleton className="h-80 w-full" />
                </div>
              </div>
            ) : !compareData || compareData.runs.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground">No data to display</p>
              </div>
            ) : (
              <>
                {/* Aligned Equity Curves */}
                <section className="mb-6">
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">Equity Curves</h3>
                    {isMobile && <span className="text-xs text-muted-foreground">(Pinch to zoom)</span>}
                  </div>

                  {alignedChartData.length === 0 ? (
                    <div className="flex h-64 items-center justify-center">
                      <p className="text-sm text-muted-foreground">No equity data available</p>
                    </div>
                  ) : (
                    <div className="h-64 sm:h-72 md:h-96">
                      <ZoomableChart>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={alignedChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <XAxis
                              dataKey="timestamp"
                              tickFormatter={(v) => formatChartDate(v, timezone)}
                              tick={{ fontSize: 12 }}
                              tickLine={false}
                              axisLine={{ stroke: "hsl(var(--border))" }}
                              tickCount={tickConfig.xAxisTicks}
                            />
                            <YAxis
                              tickFormatter={(v) => formatPrice(v, "").trim()}
                              tick={{ fontSize: 12 }}
                              tickLine={false}
                              axisLine={{ stroke: "hsl(var(--border))" }}
                              width={80}
                              tickCount={tickConfig.yAxisTicks}
                            />
                            <Tooltip
                              formatter={(value, name) => {
                                const idx = parseInt(String(name).replace("run_", ""));
                                const run = compareData.runs[idx];
                                return [formatPrice(Number(value)), `${runLabel(idx)} · ${runDateRange(run)}`];
                              }}
                              labelFormatter={(label) => formatDateTime(label as string, timezone)}
                              contentStyle={{
                                backgroundColor: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "0.375rem",
                                fontSize: "0.875rem",
                                color: "hsl(var(--popover-foreground))",
                              }}
                            />
                            <Legend
                              wrapperStyle={{ fontSize: "0.875rem" }}
                              iconType="line"
                              formatter={(value) => {
                                const idx = parseInt(String(value).replace("run_", ""));
                                return `${runLabel(idx)} · ${runDateRange(compareData.runs[idx])}`;
                              }}
                            />
                            {compareData.runs.map((_, idx) => (
                              <Line
                                key={idx}
                                type="monotone"
                                dataKey={`run_${idx}`}
                                stroke={RUN_COLORS[idx]}
                                strokeWidth={2}
                                dot={false}
                                connectNulls={false}
                                name={`run_${idx}`}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </ZoomableChart>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Lines break where a run has no data for that time period.
                  </p>
                </section>

                {/* Metrics Comparison Table */}
                <section>
                  <h3 className="mb-3 text-base font-semibold text-foreground">Metrics Comparison</h3>
                  <div className="relative min-h-[320px] overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-40">Metric</TableHead>
                          {compareData.runs.map((run, idx) => (
                            <TableHead key={run.run_id} className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="inline-block h-3 w-4 rounded-sm"
                                    style={{ backgroundColor: RUN_COLORS[idx] }}
                                  />
                                  <span className="text-xs font-semibold text-foreground">
                                    {runLabel(idx)}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {runDateRange(run)}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {formatDateTime(run.created_at, timezone)}
                                </div>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metricsConfig.map((metric) => {
                          const bestValue = bestByMetric.get(metric.key);
                          return (
                            <TableRow key={metric.key}>
                              <TableCell className="font-medium">{metric.label}</TableCell>
                              {compareData.runs.map((run) => {
                                const value = run.summary ? (run.summary as unknown as Record<string, unknown>)[metric.key] : null;
                                const isNumber = typeof value === "number" && Number.isFinite(value);
                                const isBest =
                                  isNumber &&
                                  bestValue !== undefined &&
                                  compareData.runs.length > 1 &&
                                  (value as number) === bestValue;
                                return (
                                  <TableCell
                                    key={run.run_id}
                                    className={cn(
                                      "text-center",
                                      isBest && "font-semibold text-primary"
                                    )}
                                  >
                                    {isNumber ? metric.format(value as number) : "—"}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {/* Right-edge scroll hint for horizontally overflowing tables */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent sm:hidden" />
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
