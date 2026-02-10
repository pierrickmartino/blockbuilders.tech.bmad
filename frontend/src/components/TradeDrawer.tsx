"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  Time,
} from "lightweight-charts";
import { apiFetch } from "@/lib/api";
import {
  formatDateTime,
  formatDuration,
  formatMoney,
  formatPercent,
  formatQuantity,
  formatNumber,
} from "@/lib/format";
import { useDisplay } from "@/context/display";
import { TradeDetailResponse } from "@/types/backtest";
import TradeExplanation from "./TradeExplanation";

interface TradeDrawerProps {
  runId: string;
  tradeIdx: number;
  asset: string;
  timeframe: string;
  onClose: () => void;
}

export default function TradeDrawer({
  runId,
  tradeIdx,
  asset,
  timeframe,
  onClose,
}: TradeDrawerProps) {
  const { timezone } = useDisplay();
  const [data, setData] = useState<TradeDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Fetch trade details
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    apiFetch<TradeDetailResponse>(`/backtests/${runId}/trades/${tradeIdx}`)
      .then(setData)
      .catch((e) => setError(e.message || "Failed to load trade details"))
      .finally(() => setIsLoading(false));
  }, [runId, tradeIdx]);

  // Escape key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Initialize chart
  useEffect(() => {
    if (!data || !chartContainerRef.current || data.candles.length === 0) return;

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 300,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#374151",
      },
      grid: {
        vertLines: { color: "#e5e7eb" },
        horzLines: { color: "#e5e7eb" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#e5e7eb",
      },
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    seriesRef.current = series;

    // Set candle data
    const candleData = data.candles.map((c) => ({
      time: Math.floor(new Date(c.timestamp).getTime() / 1000) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    series.setData(candleData);

    // Add entry/exit markers using attachPrimitive (v5 API)
    const entryTime = Math.floor(new Date(data.trade.entry_time).getTime() / 1000) as Time;
    const exitTime = Math.floor(new Date(data.trade.exit_time).getTime() / 1000) as Time;

    // Note: In lightweight-charts v5, setMarkers is replaced with markers primitive
    // Using series.markers() if available, otherwise skip markers
    if ("setMarkers" in series) {
      (series as unknown as { setMarkers: (markers: unknown[]) => void }).setMarkers([
        {
          time: entryTime,
          position: "belowBar",
          color: "#22c55e",
          shape: "arrowUp",
          text: "Entry",
        },
        {
          time: exitTime,
          position: "aboveBar",
          color: "#ef4444",
          shape: "arrowDown",
          text: "Exit",
        },
      ]);
    }

    // Add SL/TP price lines
    if (data.trade.sl_price_at_entry) {
      series.createPriceLine({
        price: data.trade.sl_price_at_entry,
        color: "#ef4444",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "SL",
      });
    }
    if (data.trade.tp_price_at_entry) {
      series.createPriceLine({
        price: data.trade.tp_price_at_entry,
        color: "#22c55e",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "TP",
      });
    }

    // Entry price line
    series.createPriceLine({
      price: data.trade.entry_price,
      color: "#3b82f6",
      lineWidth: 1,
      lineStyle: 1,
      axisLabelVisible: true,
      title: "Entry",
    });

    // Add indicator overlays (price pane only in Phase 1)
    if (data.indicator_series) {
      for (const ind of data.indicator_series) {
        // Skip subplot indicators (RSI, MACD) in Phase 1
        if (ind.subplot) continue;

        // Add price pane indicators (SMA, EMA, Bollinger)
        const lineSeries = chart.addSeries(LineSeries, {
          color: ind.color || "#3b82f6",
          lineWidth: 2,
          title: ind.label,
        });

        const lineData = ind.series_data
          .map((val, idx) => {
            if (val === null) return null;
            const candle = data.candles[idx];
            return {
              time: Math.floor(new Date(candle.timestamp).getTime() / 1000) as Time,
              value: val,
            };
          })
          .filter((d): d is { time: Time; value: number } => d !== null);

        lineSeries.setData(lineData);
      }
    }

    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

  const trade = data?.trade;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="absolute right-0 top-0 h-full w-full overflow-y-auto bg-white shadow-xl md:max-w-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Trade #{tradeIdx + 1}
            </h2>
            {trade && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase ${
                  trade.side === "long"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {trade.side}
              </span>
            )}
            <span className="text-sm text-gray-500">
              {asset} · {timeframe}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-gray-500">Loading trade details...</div>
            </div>
          )}

          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {trade && !isLoading && (
            <div className="space-y-6">
              {/* Key Stats Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">P&L</div>
                  <div
                    className={`text-lg font-semibold ${
                      trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatMoney(trade.pnl, "USDT", true)}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">P&L %</div>
                  <div
                    className={`text-lg font-semibold ${
                      trade.pnl_pct >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {trade.pnl_pct >= 0 ? "+" : ""}{formatPercent(trade.pnl_pct)}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Duration</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatDuration(trade.duration_seconds)}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">R-Multiple</div>
                  <div
                    className={`text-lg font-semibold ${
                      trade.r_multiple === null
                        ? "text-gray-400"
                        : trade.r_multiple >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {trade.r_multiple !== null
                      ? `${trade.r_multiple >= 0 ? "+" : ""}${trade.r_multiple.toFixed(2)}R`
                      : "—"}
                  </div>
                </div>
              </div>

              {/* Trade Explanation */}
              {(data.explanation_partial || data.entry_explanation || data.exit_explanation) && (
                <TradeExplanation
                  entry={data.entry_explanation}
                  exit={data.exit_explanation}
                  partial={data.explanation_partial}
                />
              )}

              {/* Execution Details */}
              <section>
                <h3 className="mb-2 text-sm font-medium text-gray-700">Execution</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Entry Time</span>
                    <div className="font-medium">{formatDateTime(trade.entry_time, timezone)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Exit Time</span>
                    <div className="font-medium">{formatDateTime(trade.exit_time, timezone)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Entry Price</span>
                    <div className="font-medium">{formatNumber(trade.entry_price, 2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Exit Price</span>
                    <div className="font-medium">{formatNumber(trade.exit_price, 2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Quantity</span>
                    <div className="font-medium">{formatQuantity(trade.qty)}</div>
                  </div>
                </div>
              </section>

              {/* Transaction Costs */}
              {trade.total_cost_usd !== undefined && trade.total_cost_usd !== null && (
                <section>
                  <h3 className="mb-2 text-sm font-medium text-gray-700">Transaction Costs</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fees:</span>
                      <span className="font-medium">{formatMoney(trade.fee_cost_usd ?? 0, asset, false)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Slippage:</span>
                      <span className="font-medium">{formatMoney(trade.slippage_cost_usd ?? 0, asset, false)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Spread:</span>
                      <span className="font-medium">{formatMoney(trade.spread_cost_usd ?? 0, asset, false)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-red-600">{formatMoney(trade.total_cost_usd, asset, false)}</span>
                    </div>
                  </div>
                </section>
              )}

              {/* Risk at Entry */}
              <section>
                <h3 className="mb-2 text-sm font-medium text-gray-700">Risk at Entry</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                  <div>
                    <span className="text-gray-500">Stop Loss</span>
                    <div className="font-medium">
                      {trade.sl_price_at_entry !== null
                        ? formatNumber(trade.sl_price_at_entry, 2)
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Take Profit</span>
                    <div className="font-medium">
                      {trade.tp_price_at_entry !== null
                        ? formatNumber(trade.tp_price_at_entry, 2)
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Initial Risk</span>
                    <div className="font-medium">
                      {trade.initial_risk_usd !== null
                        ? formatMoney(trade.initial_risk_usd, "USDT")
                        : "—"}
                    </div>
                  </div>
                </div>
              </section>

              {/* Excursions */}
              <section>
                <h3 className="mb-2 text-sm font-medium text-gray-700">Excursions</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* MAE */}
                  <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                    <div className="text-xs font-medium text-red-700">
                      Max Adverse Excursion (MAE)
                    </div>
                    <div className="mt-1 text-lg font-semibold text-red-600">
                      {formatPercent(trade.mae_pct)}
                    </div>
                    <div className="text-sm text-red-600">
                      {formatMoney(trade.mae_usd, "USDT")}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Trough: {formatNumber(trade.trough_price, 2)} @{" "}
                      {formatDateTime(trade.trough_ts, timezone)}
                    </div>
                  </div>
                  {/* MFE */}
                  <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                    <div className="text-xs font-medium text-green-700">
                      Max Favorable Excursion (MFE)
                    </div>
                    <div className="mt-1 text-lg font-semibold text-green-600">
                      +{formatPercent(trade.mfe_pct)}
                    </div>
                    <div className="text-sm text-green-600">
                      {formatMoney(trade.mfe_usd, "USDT", true)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Peak: {formatNumber(trade.peak_price, 2)} @{" "}
                      {formatDateTime(trade.peak_ts, timezone)}
                    </div>
                  </div>
                </div>

                {/* Entry → Peak → Exit summary */}
                {trade.mfe_pct > 0 && trade.pnl_pct < trade.mfe_pct && (
                  <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Gave back{" "}
                    <span className="font-medium">
                      {formatPercent(trade.mfe_pct - trade.pnl_pct)}
                    </span>{" "}
                    from peak to exit
                  </div>
                )}
              </section>

              {/* Context Chart */}
              <section>
                <h3 className="mb-2 text-sm font-medium text-gray-700">
                  Price Context
                </h3>
                {data && data.candles.length > 0 ? (
                  <div
                    ref={chartContainerRef}
                    className="h-[300px] w-full rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="flex h-[200px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
                    No chart data available
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
