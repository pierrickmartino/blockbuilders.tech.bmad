"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Strategy } from "@/types/strategy";
import {
  BacktestCreateResponse,
  BacktestListItem,
  BacktestStatus,
  BacktestStatusResponse,
  Trade,
} from "@/types/backtest";
import { StrategyTabs } from "@/components/StrategyTabs";

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

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatPercent = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `${value.toFixed(2)}%`;

const statusStyles: Record<BacktestStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function StrategyBacktestPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

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
  const [selectedRun, setSelectedRun] = useState<BacktestStatusResponse | null>(null);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [tradesError, setTradesError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  const fetchRunDetail = useCallback(
    async (runId: string) => {
      try {
        const detail = await apiFetch<BacktestStatusResponse>(`/backtests/${runId}`);
        setSelectedRun(detail);
        setError(null);
        setBacktests((current) =>
          current.map((run) =>
            run.run_id === runId
              ? {
                  ...run,
                  status: detail.status,
                  total_return: detail.summary?.total_return_pct ?? run.total_return,
                }
              : run
          )
        );
        return detail;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load backtest details");
        return null;
      }
    },
    []
  );

  const fetchTrades = useCallback(async (runId: string) => {
    setIsLoadingTrades(true);
    setTradesError(null);
    try {
      const data = await apiFetch<Trade[]>(`/backtests/${runId}/trades`);
      setTrades(data);
    } catch (err) {
      setTradesError(err instanceof Error ? err.message : "Failed to load trades");
      setTrades([]);
    } finally {
      setIsLoadingTrades(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRun?.status === "completed" && selectedRunId) {
      fetchTrades(selectedRunId);
      setCurrentPage(1);
    } else {
      setTrades([]);
      setTradesError(null);
    }
  }, [selectedRun?.status, selectedRunId, fetchTrades]);

  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRun(null);
      return;
    }

    let isActive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      const detail = await fetchRunDetail(selectedRunId);
      if (!detail || !isActive) return;

      if (detail.status === "pending" || detail.status === "running") {
        timer = setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      isActive = false;
      if (timer) clearTimeout(timer);
    };
  }, [selectedRunId, fetchRunDetail]);

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
    return `${new Date(selectedRun.date_from).toLocaleDateString()} → ${new Date(selectedRun.date_to).toLocaleDateString()}`;
  }, [selectedRun]);

  // Trades pagination
  const totalPages = Math.ceil(trades.length / pageSize);
  const paginatedTrades = trades.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const formatTradeDate = (value: string) =>
    new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatPnl = (pnl: number) => {
    const sign = pnl >= 0 ? "+" : "";
    return `${sign}$${pnl.toFixed(2)}`;
  };

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
                      <div className="text-sm font-semibold text-gray-900">{formatDateTime(run.created_at)}</div>
                      {statusBadge(run.status)}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                      <span>
                        {new Date(run.date_from).toLocaleDateString()} →{" "}
                        {new Date(run.date_to).toLocaleDateString()}
                      </span>
                      <span className="font-medium text-gray-900">
                        {run.total_return !== null && run.total_return !== undefined
                          ? `${run.total_return.toFixed(2)}%`
                          : "—"}
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
            {selectedRun && statusBadge(selectedRun.status)}
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
                  <div className="rounded border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs uppercase text-gray-500">Final balance</div>
                    <div className="text-lg font-semibold text-gray-900">
                      ${selectedRun.summary.final_balance.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs uppercase text-gray-500">Total return</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatPercent(selectedRun.summary.total_return_pct)}
                    </div>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs uppercase text-gray-500">Max drawdown</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatPercent(selectedRun.summary.max_drawdown_pct)}
                    </div>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs uppercase text-gray-500">CAGR</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatPercent(selectedRun.summary.cagr_pct)}
                    </div>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs uppercase text-gray-500">Trades</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {selectedRun.summary.num_trades}
                    </div>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs uppercase text-gray-500">Win rate</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatPercent(selectedRun.summary.win_rate_pct)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Backtest is {selectedRun.status}. We&apos;ll keep polling for results.
                </p>
              )}
            </div>
          )}
        </section>

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
                  onClick={() => selectedRunId && fetchTrades(selectedRunId)}
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
                          Entry (UTC)
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Entry Price
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Exit (UTC)
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {paginatedTrades.map((trade, idx) => (
                        <tr key={`${trade.entry_time}-${idx}`} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
                            {formatTradeDate(trade.entry_time)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600">
                            {formatPrice(trade.entry_price)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
                            {formatTradeDate(trade.exit_time)}
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
                            {formatPnl(trade.pnl)}
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
    </div>
  );
}
