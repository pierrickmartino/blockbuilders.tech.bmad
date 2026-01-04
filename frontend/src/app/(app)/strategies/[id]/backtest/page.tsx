"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { apiFetch, ApiError, fetchDataQuality } from "@/lib/api";
import {
  formatDateTime,
  formatPercent,
  formatPrice,
  formatMoney,
  formatChartDate,
} from "@/lib/format";
import { useDisplay } from "@/context/display";
import { useBacktestResults } from "@/hooks/useBacktestResults";
import { Strategy } from "@/types/strategy";
import {
  BacktestCreateResponse,
  BacktestListItem,
  BacktestStatus,
  BacktestStatusResponse,
  DataQualityMetrics,
} from "@/types/backtest";
import { StrategyTabs } from "@/components/StrategyTabs";
import TradeDrawer from "@/components/TradeDrawer";
import InfoIcon from "@/components/InfoIcon";
import { metricToGlossaryId, getTooltip } from "@/lib/tooltip-content";

interface Props {
  params: Promise<{ id: string }>;
}

const DEFAULT_LOOKBACK_DAYS = 180;

const formatDateInput = (date: Date) => date.toISOString().split("T")[0];

const defaultRange = (() => {
  const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - DEFAULT_LOOKBACK_DAYS);
  return { from: formatDateInput(past), to: formatDateInput(today) };
})();

const statusStyles: Record<BacktestStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function MetricCard({
  metricKey,
  label,
  value,
}: {
  metricKey: string;
  label: string;
  value: string | number;
}) {
  const tooltip = getTooltip(metricToGlossaryId(metricKey));
  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-1 text-xs uppercase text-gray-500">
        <span title={tooltip?.short}>{label}</span>
        <InfoIcon
          tooltip={tooltip}
          className="flex-shrink-0"
        />
      </div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export default function StrategyBacktestPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { timezone } = useDisplay();

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [feeRate, setFeeRate] = useState("");
  const [slippageRate, setSlippageRate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [backtests, setBacktests] = useState<BacktestListItem[]>([]);
  const [isLoadingBacktests, setIsLoadingBacktests] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Data quality state
  const [dataQuality, setDataQuality] = useState<DataQualityMetrics | null>(null);

  // Trade drawer state
  const [selectedTradeIdx, setSelectedTradeIdx] = useState<number | null>(null);

  // Use custom hook for backtest results (trades, equity curve, benchmark, polling)
  const handleRunDetailFetched = useCallback((detail: BacktestStatusResponse) => {
    setError(null);
    setBacktests((current) =>
      current.map((run) =>
        run.run_id === detail.run_id
          ? {
              ...run,
              status: detail.status,
              total_return: detail.summary?.total_return_pct ?? run.total_return,
            }
          : run
      )
    );
  }, []);

  const {
    selectedRun,
    trades,
    equityCurve,
    benchmarkCurve,
    isLoadingTrades,
    isLoadingEquityCurve,
    tradesError,
    equityCurveError,
    refetchTrades,
    refetchEquityCurve,
  } = useBacktestResults(selectedRunId, handleRunDetailFetched);

  // Reset pagination when run changes
  useEffect(() => {
    if (selectedRun?.status === "completed") {
      setCurrentPage(1);
    }
  }, [selectedRun?.status]);

  const loadStrategy = useCallback(async () => {
    setIsLoadingStrategy(true);
    try {
      const data = await apiFetch<Strategy>(`/strategies/${id}`);
      setStrategy(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        router.push("/strategies");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load strategy");
    } finally {
      setIsLoadingStrategy(false);
    }
  }, [id, router]);

  const loadBacktests = useCallback(async () => {
    setIsLoadingBacktests(true);
    try {
      const params = new URLSearchParams({ strategy_id: id });
      const data = await apiFetch<BacktestListItem[]>(`/backtests/?${params.toString()}`);
      setBacktests(data);
      setError(null);
      if (data.length > 0) {
        setSelectedRunId((current) => current ?? data[0].run_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load backtests");
    } finally {
      setIsLoadingBacktests(false);
    }
  }, [id]);

  useEffect(() => {
    loadStrategy();
    loadBacktests();
  }, [loadStrategy, loadBacktests]);

  // Fetch data quality metrics when dates or strategy change
  useEffect(() => {
    if (!strategy || !dateFrom || !dateTo) {
      setDataQuality(null);
      return;
    }

    fetchDataQuality(strategy.asset, strategy.timeframe, dateFrom, dateTo)
      .then((data) => setDataQuality(data as DataQualityMetrics))
      .catch(() => setDataQuality(null));
  }, [strategy, dateFrom, dateTo]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage(null);
    setError(null);

    if (!dateFrom || !dateTo) {
      setError("Please select a start and end date.");
      return;
    }

    const fromDate = new Date(`${dateFrom}T00:00:00Z`);
    const toDate = new Date(`${dateTo}T23:59:59Z`);

    if (fromDate >= toDate) {
      setError("End date must be after start date.");
      return;
    }

    const payload: Record<string, unknown> = {
      strategy_id: id,
      date_from: fromDate.toISOString(),
      date_to: toDate.toISOString(),
    };

    if (feeRate) payload.fee_rate = Number(feeRate);
    if (slippageRate) payload.slippage_rate = Number(slippageRate);

    setIsSubmitting(true);
    try {
      const res = await apiFetch<BacktestCreateResponse>("/backtests/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setStatusMessage("Backtest started. It will update automatically when finished.");
      setSelectedRunId(res.run_id);
      await loadBacktests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start backtest");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadge = useCallback((status: BacktestStatus) => {
    const cls = statusStyles[status];
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
        {status}
      </span>
    );
  }, []);

  const selectedRunRange = useMemo(() => {
    if (!selectedRun) return null;
    return `${formatDateTime(selectedRun.date_from, timezone).split(" ")[0]} → ${formatDateTime(selectedRun.date_to, timezone).split(" ")[0]}`;
  }, [selectedRun, timezone]);

  // Merge equity curve and benchmark for chart
  const chartData = useMemo(() => {
    if (equityCurve.length === 0) return [];

    const benchmarkMap = new Map(
      benchmarkCurve.map((b) => [b.timestamp, b.equity])
    );

    return equityCurve.map((point) => ({
      timestamp: point.timestamp,
      equity: point.equity,
      benchmark: benchmarkMap.get(point.timestamp) || null,
    }));
  }, [equityCurve, benchmarkCurve]);

  // Calculate drawdown data for drawdown chart
  const drawdownData = useMemo(() => {
    if (equityCurve.length < 2) return [];

    let peak = equityCurve[0].equity;
    let maxDrawdown = 0;
    let maxDrawdownStartIdx = 0;
    let maxDrawdownEndIdx = 0;
    let currentDrawdownStartIdx = 0;

    // First pass: calculate drawdowns and find max drawdown period
    const points = equityCurve.map((point, idx) => {
      if (point.equity > peak) {
        peak = point.equity;
        currentDrawdownStartIdx = idx;
      }

      // Guard against division by zero
      const drawdown = peak > 0 ? ((point.equity - peak) / peak) * 100 : 0;

      // Track max drawdown
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownStartIdx = currentDrawdownStartIdx;
        maxDrawdownEndIdx = idx;
      }

      return {
        timestamp: point.timestamp,
        drawdown,
        equity: point.equity,
        peak,
      };
    });

    // Second pass: find recovery point (when equity returns to peak after max drawdown)
    for (let i = maxDrawdownEndIdx + 1; i < points.length; i++) {
      if (points[i].equity >= points[maxDrawdownEndIdx].peak) {
        maxDrawdownEndIdx = i;
        break;
      }
    }

    // Mark max drawdown period
    return points.map((point, idx) => ({
      timestamp: point.timestamp,
      drawdown: point.drawdown,
      isMaxDrawdown: idx >= maxDrawdownStartIdx && idx <= maxDrawdownEndIdx,
    }));
  }, [equityCurve]);

  // Trades pagination
  const totalPages = Math.ceil(trades.length / pageSize);
  const paginatedTrades = trades.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
    <div className="flex h-screen flex-col">
      {/* Top Bar */}
      <div className="border-b bg-white px-4 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/strategies" className="text-gray-500 hover:text-gray-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">{strategy.name}</h1>
            <span className="hidden rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 sm:inline">
              {strategy.asset}
            </span>
            <span className="hidden rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 sm:inline">
              {strategy.timeframe}
            </span>
          </div>
          <p className="text-sm text-gray-600">Run a backtest on the latest saved version of this strategy.</p>
        </div>

        <StrategyTabs strategyId={id} activeTab="backtest" />

        {error && (
          <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
        {statusMessage && (
          <div className="mt-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-600">
            {statusMessage}
          </div>
        )}
        {dataQuality?.has_issues && (
          <div className="mt-2 rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
            ⚠️ Data quality warning: {dataQuality.issues_description}. Results may be less reliable.
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4 overflow-auto bg-gray-50 p-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Run a backtest</h2>
                <p className="text-sm text-gray-500">
                  Uses the latest saved version of your strategy. Fee and slippage default to your settings.
                </p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date from</label>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date to</label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fee rate (optional)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="0.1"
                  value={feeRate}
                  onChange={(e) => setFeeRate(e.target.value)}
                  placeholder="0.001 for 0.1%"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Slippage rate (optional)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="0.1"
                  value={slippageRate}
                  onChange={(e) => setSlippageRate(e.target.value)}
                  placeholder="0.0005 for 0.05%"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Backtests run in the background. You can leave this page and results will still be saved.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Starting..." : "Run backtest"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Recent runs</h2>
              <button
                onClick={loadBacktests}
                disabled={isLoadingBacktests}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {isLoadingBacktests ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            {backtests.length === 0 ? (
              <p className="text-sm text-gray-500">No backtests yet. Run your first one above.</p>
            ) : (
              <div className="space-y-3">
                {backtests.map((run) => (
                  <button
                    key={run.run_id}
                    onClick={() => setSelectedRunId(run.run_id)}
                    className={`w-full rounded border px-3 py-2 text-left transition hover:border-blue-300 ${
                      selectedRunId === run.run_id ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">{formatDateTime(run.created_at, timezone)}</div>
                      {statusBadge(run.status)}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                      <span>
                        {formatDateTime(run.date_from, timezone).split(" ")[0]} →{" "}
                        {formatDateTime(run.date_to, timezone).split(" ")[0]}
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatPercent(run.total_return)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Run details</h2>
            <div className="flex items-center gap-3">
              <Link
                href="/metrics-glossary"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View metrics glossary
              </Link>
              {selectedRun && statusBadge(selectedRun.status)}
            </div>
          </div>
          {!selectedRunId && <p className="text-sm text-gray-500">Select a run to see details.</p>}
          {selectedRunId && !selectedRun && (
            <p className="text-sm text-gray-500">Loading backtest details...</p>
          )}
          {selectedRun && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">Range:</span>{" "}
                {selectedRunRange}
              </div>
              {selectedRun.status === "failed" ? (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {selectedRun.error_message || "Backtest failed. Please try again."}
                </div>
              ) : selectedRun.summary ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard
                    metricKey="final-balance"
                    label="Final balance"
                    value={formatPrice(selectedRun.summary.final_balance)}
                  />
                  <MetricCard
                    metricKey="total-return"
                    label="Total return"
                    value={formatPercent(selectedRun.summary.total_return_pct)}
                  />
                  <MetricCard
                    metricKey="max-drawdown"
                    label="Max drawdown"
                    value={formatPercent(selectedRun.summary.max_drawdown_pct)}
                  />
                  <MetricCard
                    metricKey="cagr"
                    label="CAGR"
                    value={formatPercent(selectedRun.summary.cagr_pct)}
                  />
                  <MetricCard
                    metricKey="trades"
                    label="Trades"
                    value={selectedRun.summary.num_trades}
                  />
                  <MetricCard
                    metricKey="win-rate"
                    label="Win rate"
                    value={formatPercent(selectedRun.summary.win_rate_pct)}
                  />
                  <MetricCard
                    metricKey="benchmark-return"
                    label="Benchmark return"
                    value={formatPercent(selectedRun.summary.benchmark_return_pct)}
                  />
                  <MetricCard
                    metricKey="alpha"
                    label="Alpha"
                    value={formatPercent(selectedRun.summary.alpha)}
                  />
                  <MetricCard
                    metricKey="beta"
                    label="Beta"
                    value={selectedRun.summary.beta.toFixed(2)}
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Backtest is {selectedRun.status}. We&apos;ll keep polling for results.
                </p>
              )}

              {/* Data Quality Metrics */}
              {selectedRun.data_quality && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-700">Data Quality</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Gap %</div>
                      <div className="text-lg font-semibold">
                        {selectedRun.data_quality.gap_percent.toFixed(2)}%
                      </div>
                    </div>
                    <div className="rounded border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Outliers</div>
                      <div className="text-lg font-semibold">
                        {selectedRun.data_quality.outlier_count}
                      </div>
                    </div>
                    <div className="rounded border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Volume Consistency</div>
                      <div className="text-lg font-semibold">
                        {selectedRun.data_quality.volume_consistency.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  {selectedRun.data_quality.has_issues && (
                    <div className="mt-2 text-xs text-yellow-600">
                      ⚠️ {selectedRun.data_quality.issues_description}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Equity Curve Chart - only show for completed runs */}
        {selectedRun?.status === "completed" && (
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Equity Curve</h2>

            {isLoadingEquityCurve ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-gray-500">Loading equity curve...</p>
              </div>
            ) : equityCurveError ? (
              <div className="flex h-64 items-center justify-center rounded border border-red-200 bg-red-50">
                <div className="text-center">
                  <p className="text-sm text-red-600">{equityCurveError}</p>
                  <button
                    onClick={refetchEquityCurve}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : equityCurve.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-gray-500">No equity data available for this run.</p>
                  <button
                    onClick={refetchEquityCurve}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-64 sm:h-72 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(v) => formatChartDate(v, timezone)}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      tickFormatter={(v) => formatPrice(v, "").trim()}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value) => [formatPrice(Number(value)), "Equity"]}
                      labelFormatter={(label) => formatDateTime(label as string, timezone)}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "0.875rem" }}
                      iconType="line"
                    />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "#2563eb" }}
                      name="Strategy"
                    />
                    <Line
                      type="monotone"
                      dataKey="benchmark"
                      stroke="#9ca3af"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 5"
                      name="Buy & Hold"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        )}

        {/* Drawdown Chart - only show for completed runs */}
        {selectedRun?.status === "completed" && (
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Drawdown (%)</h2>

            {isLoadingEquityCurve ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-gray-500">Loading drawdown data...</p>
              </div>
            ) : equityCurveError ? (
              <div className="flex h-64 items-center justify-center rounded border border-red-200 bg-red-50">
                <div className="text-center">
                  <p className="text-sm text-red-600">{equityCurveError}</p>
                  <button
                    onClick={refetchEquityCurve}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : drawdownData.length < 2 ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-gray-500">Not enough data to display drawdown chart</p>
              </div>
            ) : (
              <div className="h-64 sm:h-72 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={drawdownData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(v) => formatChartDate(v, timezone)}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      tickFormatter={(v) => `${v.toFixed(1)}%`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                      width={60}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(2)}%`, "Drawdown"]}
                      labelFormatter={(label) => formatDateTime(label as string, timezone)}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                      }}
                    />
                    <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                    {drawdownData.some((d) => d.isMaxDrawdown) && (
                      <ReferenceArea
                        x1={drawdownData.find((d) => d.isMaxDrawdown)?.timestamp}
                        x2={drawdownData.filter((d) => d.isMaxDrawdown).pop()?.timestamp}
                        fill="#fca5a5"
                        fillOpacity={0.2}
                        strokeOpacity={0}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="drawdown"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fill="url(#drawdownGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#ef4444" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        )}

        {/* Trades Table - only show for completed runs */}
        {selectedRun?.status === "completed" && (
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Trades</h2>
              {trades.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{trades.length} total</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
              )}
            </div>

            {isLoadingTrades ? (
              <p className="text-sm text-gray-500">Loading trades...</p>
            ) : tradesError ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-red-600">{tradesError}</p>
                <button
                  onClick={refetchTrades}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Retry
                </button>
              </div>
            ) : trades.length === 0 ? (
              <p className="text-sm text-gray-500">No trades were generated for this run.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Entry {timezone === "utc" ? "(UTC)" : ""}
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Entry Price
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Exit {timezone === "utc" ? "(UTC)" : ""}
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Exit Price
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Side
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                          P&L
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                          P&L %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {paginatedTrades.map((trade, idx) => (
                        <tr
                          key={`${trade.entry_time}-${idx}`}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedTradeIdx((currentPage - 1) * pageSize + idx)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedTradeIdx((currentPage - 1) * pageSize + idx);
                            }
                          }}
                        >
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
                            {formatDateTime(trade.entry_time, timezone)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600">
                            {formatPrice(trade.entry_price)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
                            {formatDateTime(trade.exit_time, timezone)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600">
                            {formatPrice(trade.exit_price)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600 uppercase">
                            {trade.side}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-2 text-right text-sm font-medium ${
                              trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatMoney(trade.pnl, "USDT", true)}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-2 text-right text-sm ${
                              trade.pnl_pct >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {trade.pnl_pct >= 0 ? "+" : ""}{formatPercent(trade.pnl_pct).replace("%", "")}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <p className="text-sm text-gray-500">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>

      {/* Trade Details Drawer */}
      {selectedTradeIdx !== null && selectedRunId && selectedRun && (
        <TradeDrawer
          runId={selectedRunId}
          tradeIdx={selectedTradeIdx}
          asset={selectedRun.asset}
          timeframe={selectedRun.timeframe}
          onClose={() => setSelectedTradeIdx(null)}
        />
      )}
    </div>
  );
}
