"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, Time } from "lightweight-charts";
import { apiFetch } from "@/lib/api";
import { TradeDetailResponse } from "@/types/backtest";

interface TradeDrawerProps {
  runId: string;
  tradeIdx: number;
  asset: string;
  timeframe: string;
  onClose: () => void;
}

const EXIT_REASON_LABELS: Record<string, string> = {
  tp: "Take Profit",
  sl: "Stop Loss",
  signal: "Exit Signal",
  end_of_data: "End of Test",
  unknown: "Unknown",
};

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toPrecision(4);
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function TradeDrawer({
  runId,
  tradeIdx,
  asset,
  timeframe,
  onClose,
}: TradeDrawerProps) {
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
                    {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">P&L %</div>
                  <div
                    className={`text-lg font-semibold ${
                      trade.pnl_pct >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {trade.pnl_pct >= 0 ? "+" : ""}{trade.pnl_pct.toFixed(2)}%
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

              {/* Execution Details */}
              <section>
                <h3 className="mb-2 text-sm font-medium text-gray-700">Execution</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Entry Time</span>
                    <div className="font-medium">{formatTimestamp(trade.entry_time)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Exit Time</span>
                    <div className="font-medium">{formatTimestamp(trade.exit_time)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Entry Price</span>
                    <div className="font-medium">{formatPrice(trade.entry_price)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Exit Price</span>
                    <div className="font-medium">{formatPrice(trade.exit_price)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Quantity</span>
                    <div className="font-medium">{trade.qty.toFixed(6)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Exit Reason</span>
                    <div className="font-medium">
                      {EXIT_REASON_LABELS[trade.exit_reason] || trade.exit_reason}
                    </div>
                  </div>
                </div>
              </section>

              {/* Risk at Entry */}
              <section>
                <h3 className="mb-2 text-sm font-medium text-gray-700">Risk at Entry</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                  <div>
                    <span className="text-gray-500">Stop Loss</span>
                    <div className="font-medium">
                      {trade.sl_price_at_entry !== null
                        ? formatPrice(trade.sl_price_at_entry)
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Take Profit</span>
                    <div className="font-medium">
                      {trade.tp_price_at_entry !== null
                        ? formatPrice(trade.tp_price_at_entry)
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Initial Risk</span>
                    <div className="font-medium">
                      {trade.initial_risk_usd !== null
                        ? `$${trade.initial_risk_usd.toFixed(2)}`
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
                      {trade.mae_pct.toFixed(2)}%
                    </div>
                    <div className="text-sm text-red-600">
                      ${trade.mae_usd.toFixed(2)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Trough: {formatPrice(trade.trough_price)} @{" "}
                      {formatTimestamp(trade.trough_ts)}
                    </div>
                  </div>
                  {/* MFE */}
                  <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                    <div className="text-xs font-medium text-green-700">
                      Max Favorable Excursion (MFE)
                    </div>
                    <div className="mt-1 text-lg font-semibold text-green-600">
                      +{trade.mfe_pct.toFixed(2)}%
                    </div>
                    <div className="text-sm text-green-600">
                      +${trade.mfe_usd.toFixed(2)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Peak: {formatPrice(trade.peak_price)} @{" "}
                      {formatTimestamp(trade.peak_ts)}
                    </div>
                  </div>
                </div>

                {/* Entry → Peak → Exit summary */}
                {trade.mfe_pct > 0 && trade.pnl_pct < trade.mfe_pct && (
                  <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Gave back{" "}
                    <span className="font-medium">
                      {(trade.mfe_pct - trade.pnl_pct).toFixed(2)}%
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
