"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartTheme } from "@/lib/chart-theme";
import { useChartData, type ChartIndicatorSelection } from "@/hooks/useChartData";
import { buildChartIndicatorCatalog } from "@/lib/chart-indicators";
import type { ChartCandle, ChartDataResponse, IndicatorSeries } from "@/types/chart";
import { cn } from "@/lib/utils";

interface MarketChartPanelProps {
  asset: string | null;
  timeframe?: string;
  onClose: () => void;
}

const DEFAULT_TIMEFRAME = "1d";

const PRICE_PANE_HEIGHT = 360;
const OSCILLATOR_PANE_HEIGHT = 140;

function hasTimezoneOffset(ts: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(ts);
}

function parseUtcTimestamp(ts: string): number {
  const normalized = hasTimezoneOffset(ts) ? ts : `${ts}Z`;
  return Math.floor(new Date(normalized).getTime() / 1000);
}

function toChartTime(ts: string, timeframe: string): Time {
  if (timeframe === "1d") {
    return ts.slice(0, 10) as Time;
  }
  return parseUtcTimestamp(ts) as Time;
}

function chartTimeKey(time: Time): string {
  if (typeof time === "string" || typeof time === "number") {
    return String(time);
  }
  return `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
}

interface FocusedCandle {
  candle: ChartCandle;
}

export function MarketChartPanel({
  asset,
  timeframe = DEFAULT_TIMEFRAME,
  onClose,
}: MarketChartPanelProps): JSX.Element {
  const catalog = useMemo(() => buildChartIndicatorCatalog(), []);
  const [selection, setSelection] = useState<ChartIndicatorSelection[]>([
    { key: "ema", period: 20 },
    { key: "rsi", period: 14 },
  ]);
  const { data, isLoading, error, refresh } = useChartData({
    asset,
    timeframe,
    indicators: selection,
  });

  const open = asset !== null;

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const toggleIndicator = (key: string, defaultPeriod: number | undefined) => {
    setSelection((prev) => {
      const exists = prev.find((s) => s.key === key);
      if (exists) return prev.filter((s) => s.key !== key);
      return [...prev, { key, period: defaultPeriod }];
    });
  };

  const priceSeries = data?.indicators.filter((s) => s.pane === "price") ?? [];
  const oscillatorSeries = data?.indicators.filter((s) => s.pane === "oscillator") ?? [];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        hideCloseButton
        // Override the default sm:max-w-sm cap and size to ~80% on desktop.
        className={cn(
          "w-full p-0 sm:max-w-none md:w-[80vw] flex flex-col gap-0",
        )}
        aria-label={asset ? `Chart inspection for ${asset}` : "Chart inspection"}
      >
        <ChartPanelHeader
          asset={asset}
          timeframe={timeframe}
          earliest={data?.data_status.earliest_candle ?? null}
          latest={data?.data_status.latest_candle ?? null}
          onClose={onClose}
        />

        <IndicatorSelector
          catalog={catalog}
          selection={selection}
          onToggle={toggleIndicator}
          onPeriodChange={(key, period) =>
            setSelection((prev) =>
              prev.map((s) => (s.key === key ? { ...s, period } : s)),
            )
          }
        />

        <ChartPanelBody
          key={`${asset ?? ""}:${timeframe}`}
          asset={asset}
          timeframe={timeframe}
          data={data}
          isLoading={isLoading}
          error={error}
          priceSeries={priceSeries}
          oscillatorSeries={oscillatorSeries}
          onRetry={refresh}
        />
      </SheetContent>
    </Sheet>
  );
}

function ChartPanelBody({
  asset,
  timeframe,
  data,
  isLoading,
  error,
  priceSeries,
  oscillatorSeries,
  onRetry,
}: {
  asset: string | null;
  timeframe: string;
  data: ChartDataResponse | null;
  isLoading: boolean;
  error: string | null;
  priceSeries: IndicatorSeries[];
  oscillatorSeries: IndicatorSeries[];
  onRetry: () => void;
}) {
  const [focused, setFocused] = useState<FocusedCandle | null>(null);
  const handleFocus = useCallback((next: ChartCandle | null) => {
    setFocused(next ? { candle: next } : null);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {isLoading && !data ? (
        <Skeleton className="h-[480px] w-full" />
      ) : error ? (
        <ChartErrorState message={error} onRetry={onRetry} />
      ) : data && !data.data_status.has_candles ? (
        <ChartEmptyState asset={asset ?? ""} timeframe={timeframe} />
      ) : data ? (
        <ChartCanvas
          timeframe={timeframe}
          candles={data.candles}
          priceSeries={priceSeries}
          oscillatorSeries={oscillatorSeries}
          onFocus={handleFocus}
        />
      ) : null}

      {focused && <CandleReadout candle={focused.candle} />}

      {data && (
        <SeriesLegend price={priceSeries} oscillator={oscillatorSeries} />
      )}
    </div>
  );
}

// --- header ---------------------------------------------------------------

function ChartPanelHeader({
  asset,
  timeframe,
  earliest,
  latest,
  onClose,
}: {
  asset: string | null;
  timeframe: string;
  earliest: string | null;
  latest: string | null;
  onClose: () => void;
}) {
  return (
    <header className="flex items-start justify-between border-b p-4">
      <div>
        <h2 className="text-lg font-semibold">{asset ?? ""}</h2>
        <p className="text-xs text-muted-foreground">
          Candle interval: <span className="data-text">{timeframe}</span>
          {earliest && latest && (
            <>
              {" · "}
              Available data:{" "}
              <span className="data-text">
                {earliest.slice(0, 10)} to {latest.slice(0, 10)}
              </span>
            </>
          )}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        aria-label="Close chart panel"
      >
        <X className="h-4 w-4" />
      </Button>
    </header>
  );
}

// --- selector -------------------------------------------------------------

function IndicatorSelector({
  catalog,
  selection,
  onToggle,
  onPeriodChange,
}: {
  catalog: ReturnType<typeof buildChartIndicatorCatalog>;
  selection: ChartIndicatorSelection[];
  onToggle: (key: string, defaultPeriod: number | undefined) => void;
  onPeriodChange: (key: string, period: number) => void;
}) {
  const active = (key: string) => selection.find((s) => s.key === key);

  return (
    <div className="border-b p-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground mr-1">
        Chart indicators
      </span>
      {catalog.map((opt) => {
        const sel = active(opt.key);
        const isActive = sel !== undefined;
        return (
          <div
            key={opt.key}
            className={cn(
              "flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
              isActive ? "border-primary bg-primary/10" : "border-border",
            )}
          >
            <button
              type="button"
              onClick={() => onToggle(opt.key, opt.defaultPeriod)}
              aria-pressed={isActive}
              className="font-medium"
            >
              {opt.label}
            </button>
            {isActive && opt.defaultPeriod != null && sel?.period != null && (
              <input
                type="number"
                min={1}
                max={500}
                value={sel.period}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 1) onPeriodChange(opt.key, v);
                }}
                className="w-12 rounded border border-border bg-background px-1 py-0.5 text-xs data-text"
                aria-label={`${opt.label} lookback period`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- chart canvas ---------------------------------------------------------

function ChartCanvas({
  timeframe,
  candles,
  priceSeries,
  oscillatorSeries,
  onFocus,
}: {
  timeframe: string;
  candles: ChartCandle[];
  priceSeries: IndicatorSeries[];
  oscillatorSeries: IndicatorSeries[];
  onFocus: (focus: ChartCandle | null) => void;
}) {
  const theme = useChartTheme();
  const priceContainerRef = useRef<HTMLDivElement>(null);
  const oscillatorContainerRef = useRef<HTMLDivElement>(null);
  const priceChartRef = useRef<IChartApi | null>(null);
  const oscChartRef = useRef<IChartApi | null>(null);

  // Build a timestamp -> candle index for crosshair lookups.
  const candleByTime = useMemo(() => {
    const map = new Map<string, ChartCandle>();
    for (const c of candles) {
      map.set(chartTimeKey(toChartTime(c.timestamp, timeframe)), c);
    }
    return map;
  }, [candles, timeframe]);

  // Price pane (candles + volume + price-pane indicators)
  useEffect(() => {
    const container = priceContainerRef.current;
    if (!container || candles.length === 0) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: PRICE_PANE_HEIGHT,
      layout: {
        background: { color: theme.background },
        textColor: theme.text,
      },
      grid: {
        vertLines: { color: theme.grid },
        horzLines: { color: theme.grid },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: theme.axis,
      },
      rightPriceScale: { borderColor: theme.axis },
      crosshair: { mode: 0 },
    });
    priceChartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: theme.up,
      downColor: theme.down,
      borderUpColor: theme.up,
      borderDownColor: theme.down,
      wickUpColor: theme.up,
      wickDownColor: theme.down,
    });
    candleSeries.setData(
      candles.map((c) => ({
        time: toChartTime(c.timestamp, timeframe),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: theme.indicators[3],
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(
      candles.map((c) => ({
        time: toChartTime(c.timestamp, timeframe),
        value: c.volume,
        color: c.close >= c.open ? theme.up : theme.down,
      })),
    );

    priceSeries.forEach((s, i) => {
      const lineSeries = chart.addSeries(LineSeries, {
        color: theme.indicators[i % theme.indicators.length],
        lineWidth: 2,
        title: s.label,
      });
      lineSeries.setData(
        s.points
          .filter((p) => p.value !== null)
          .map((p) => ({
            time: toChartTime(p.timestamp, timeframe),
            value: p.value as number,
          })),
      );
    });

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        onFocus(null);
        return;
      }
      const c = candleByTime.get(chartTimeKey(param.time));
      if (c) onFocus(c);
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      priceChartRef.current = null;
    };
    // theme intentionally included so we rebuild on dark-mode toggle
  }, [candles, priceSeries, theme, candleByTime, onFocus, timeframe]);

  // Oscillator pane (separate chart instance)
  useEffect(() => {
    const container = oscillatorContainerRef.current;
    if (!container || oscillatorSeries.length === 0) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: OSCILLATOR_PANE_HEIGHT,
      layout: {
        background: { color: theme.background },
        textColor: theme.text,
      },
      grid: {
        vertLines: { color: theme.grid },
        horzLines: { color: theme.grid },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: theme.axis,
      },
      rightPriceScale: { borderColor: theme.axis },
    });
    oscChartRef.current = chart;

    oscillatorSeries.forEach((s, i) => {
      const isHistogram = s.key.endsWith("_hist");
      const series = isHistogram
        ? chart.addSeries(HistogramSeries, {
            color: theme.indicators[i % theme.indicators.length],
            title: s.label,
          })
        : chart.addSeries(LineSeries, {
            color: theme.indicators[i % theme.indicators.length],
            lineWidth: 2,
            title: s.label,
          });

      const points = s.points
        .filter((p) => p.value !== null)
        .map((p) => ({
          time: toChartTime(p.timestamp, timeframe),
          value: p.value as number,
        }));
      (series as ISeriesApi<"Line"> | ISeriesApi<"Histogram">).setData(points);
    });

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      oscChartRef.current = null;
    };
  }, [oscillatorSeries, theme, timeframe]);

  return (
    <div className="space-y-2">
      <div ref={priceContainerRef} aria-label="Candlestick price chart" />
      {oscillatorSeries.length > 0 && (
        <div ref={oscillatorContainerRef} aria-label="Selected indicator chart" />
      )}
    </div>
  );
}

// --- supporting blocks ----------------------------------------------------

function CandleReadout({ candle }: { candle: ChartCandle }) {
  return (
    <div
      className="rounded-md border bg-card p-3 text-xs flex flex-wrap gap-x-4 gap-y-1"
      role="status"
      aria-live="polite"
    >
      <span className="data-text font-medium">
        {candle.timestamp.replace("T", " ").slice(0, 16)}
      </span>
      <span>Open <span className="data-text">{candle.open}</span></span>
      <span>High <span className="data-text">{candle.high}</span></span>
      <span>Low <span className="data-text">{candle.low}</span></span>
      <span>Close <span className="data-text">{candle.close}</span></span>
      <span>Volume <span className="data-text">{candle.volume}</span></span>
    </div>
  );
}

function SeriesLegend({
  price,
  oscillator,
}: {
  price: IndicatorSeries[];
  oscillator: IndicatorSeries[];
}) {
  if (price.length === 0 && oscillator.length === 0) return null;
  return (
    <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
      {[...price, ...oscillator].map((s) => (
        <span key={s.key} className="rounded border px-2 py-0.5">
          {s.label}
        </span>
      ))}
    </div>
  );
}

function ChartEmptyState({ asset, timeframe }: { asset: string; timeframe: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <p className="text-sm font-medium">No price candles for this selection.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {asset} at {timeframe}. Try another pair or timeframe when available.
      </p>
    </div>
  );
}

function ChartErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-destructive">Could not load the chart.</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
