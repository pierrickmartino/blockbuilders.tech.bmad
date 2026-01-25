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

  // Metrics for comparison table
  const metricsConfig = [
    { key: "total_return_pct", label: "Total return", format: formatPercent },
    { key: "cagr_pct", label: "CAGR", format: formatPercent },
    { key: "max_drawdown_pct", label: "Max drawdown", format: formatPercent },
    { key: "sharpe_ratio", label: "Sharpe ratio", format: (v: number) => v.toFixed(2) },
    { key: "sortino_ratio", label: "Sortino ratio", format: (v: number) => v.toFixed(2) },
    { key: "calmar_ratio", label: "Calmar ratio", format: (v: number) => v.toFixed(2) },
    { key: "num_trades", label: "Trades", format: (v: number) => v.toString() },
    { key: "win_rate_pct", label: "Win rate", format: formatPercent },
    { key: "max_consecutive_losses", label: "Max consec. losses", format: (v: number) => v.toString() },
    { key: "benchmark_return_pct", label: "Benchmark return", format: formatPercent },
    { key: "alpha", label: "Alpha", format: formatPercent },
    { key: "beta", label: "Beta", format: (v: number) => v.toFixed(2) },
  ];

  const tickConfig = useMemo(() => {
    if (isMobile) {
      return { xAxisTicks: 3, yAxisTicks: 4 };
    }
    return { xAxisTicks: undefined, yAxisTicks: undefined };
  }, [isMobile]);

  if (isLoadingStrategy) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading strategy...</div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Strategy not found</p>
          <Link href="/strategies" className="mt-4 text-blue-600 hover:text-blue-800">
            Back to strategies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-8">
      <div className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">{strategy.name}</h1>
              <p className="mt-1 text-sm text-gray-600">
                {strategy.asset} · {strategy.timeframe}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/strategies/${id}/backtest`)}
            >
              Back to backtests
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <StrategyTabs strategyId={id} activeTab="backtest" />

        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Compare Backtests ({runIds.length})
            </h2>

            {error && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-gray-500">Loading comparison...</p>
              </div>
            ) : !compareData || compareData.runs.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-gray-500">No data to display</p>
              </div>
            ) : (
              <>
                {/* Aligned Equity Curves */}
                <section className="mb-6">
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">Equity Curves</h3>
                    {isMobile && <span className="text-xs text-gray-500">(Pinch to zoom)</span>}
                  </div>

                  {alignedChartData.length === 0 ? (
                    <div className="flex h-64 items-center justify-center">
                      <p className="text-sm text-gray-500">No equity data available</p>
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
                                const runLabel = formatDateTime(compareData.runs[idx].created_at, timezone);
                                return [formatPrice(Number(value)), runLabel];
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
                                return formatDateTime(compareData.runs[idx].created_at, timezone);
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
                </section>

                {/* Metrics Comparison Table */}
                <section>
                  <h3 className="mb-3 text-base font-semibold text-gray-900">Metrics Comparison</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-40">Metric</TableHead>
                          {compareData.runs.map((run, idx) => (
                            <TableHead key={run.run_id} className="text-center">
                              <div
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ backgroundColor: RUN_COLORS[idx] }}
                              />
                              <div className="mt-1 text-xs">
                                {formatDateTime(run.created_at, timezone)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDateTime(run.date_from, timezone).split(" ")[0]} →{" "}
                                {formatDateTime(run.date_to, timezone).split(" ")[0]}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metricsConfig.map((metric) => (
                          <TableRow key={metric.key}>
                            <TableCell className="font-medium">{metric.label}</TableCell>
                            {compareData.runs.map((run) => {
                              const value = run.summary ? (run.summary as unknown as Record<string, unknown>)[metric.key] : null;
                              return (
                                <TableCell key={run.run_id} className="text-center">
                                  {value !== null && value !== undefined
                                    ? metric.format(value)
                                    : "—"}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
