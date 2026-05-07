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
import { Plus, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
const TIMEFRAMES = ["1h", "4h", "1d", "1w"] as const;

const PRICE_PANE_HEIGHT = 360;
const OSCILLATOR_PANE_HEIGHT = 140;
const MAX_INDICATOR_PERIOD = 500;

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 8,
});
const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  notation: "compact",
});

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

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatVolume(value: number): string {
  return compactNumberFormatter.format(value);
}

function formatDateLabel(value: string): string {
  if (!value) return "Unknown";
  return value.replace("T", " ").slice(0, 16);
}

function clampPeriod(value: number): number {
  return Math.min(Math.max(Math.round(value), 1), MAX_INDICATOR_PERIOD);
}

function getChartErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "The chart service did not return a useful error.";
  if (/401|403|unauthor/i.test(trimmed)) {
    return "You do not have access to this chart data. Sign in again and retry.";
  }
  if (/429|rate/i.test(trimmed)) {
    return "The market data service is busy. Wait a moment, then retry.";
  }
  if (/network|fetch|timeout|offline/i.test(trimmed)) {
    return "The market data service could not be reached. Check the connection and retry.";
  }
  return trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
}

interface FocusedCandle {
  candle: ChartCandle;
}

export function MarketChartPanel({
  asset,
  timeframe = DEFAULT_TIMEFRAME,
  onClose,
}: MarketChartPanelProps): JSX.Element {
  const [activeTimeframe, setActiveTimeframe] = useState(timeframe);
  const catalog = useMemo(() => buildChartIndicatorCatalog(), []);
  const [selection, setSelection] = useState<ChartIndicatorSelection[]>([
    { key: "ema", period: 20 },
    { key: "rsi", period: 14 },
  ]);
  const { data, isLoading, error, refresh } = useChartData({
    asset,
    timeframe: activeTimeframe,
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
          "flex w-full flex-col gap-0 p-0 sm:max-w-none md:w-[88vw] xl:w-[80vw]",
        )}
        aria-label={asset ? `Chart inspection for ${asset}` : "Chart inspection"}
      >
        <div className="sticky top-0 z-10 border-b bg-background">
          <ChartPanelHeader
            asset={asset}
            timeframe={activeTimeframe}
            earliest={data?.data_status.earliest_candle ?? null}
            latest={data?.data_status.latest_candle ?? null}
            onClose={onClose}
            onTimeframeChange={setActiveTimeframe}
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
        </div>

        <ChartPanelBody
          key={`${asset ?? ""}:${activeTimeframe}`}
          asset={asset}
          timeframe={activeTimeframe}
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

  const latestCandle = data?.candles.at(-1) ?? null;

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
      {isLoading && !data ? (
        <div role="status" aria-live="polite" aria-label="Loading chart data">
          <Skeleton className="h-[480px] w-full" />
        </div>
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

      {data && data.data_status.has_candles && (
        <ChartDataSummary
          asset={asset}
          timeframe={timeframe}
          candles={data.candles}
          selectedCandle={focused?.candle ?? latestCandle}
          priceSeries={priceSeries}
          oscillatorSeries={oscillatorSeries}
          isRefreshing={isLoading}
        />
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
  onTimeframeChange,
}: {
  asset: string | null;
  timeframe: string;
  earliest: string | null;
  latest: string | null;
  onClose: () => void;
  onTimeframeChange: (tf: string) => void;
}) {
  return (
    <header className="flex items-start justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-semibold" title={asset ?? undefined}>
          {asset ?? "Chart inspection"}
        </h2>
        {earliest && latest && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="data-text">{earliest.slice(0, 10)} to {latest.slice(0, 10)}</span>
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex gap-1" role="group" aria-label="Chart timeframe">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange(tf)}
              className={cn(
                "data-text rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring",
                tf === timeframe
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-pressed={tf === timeframe}
              aria-label={`${tf} timeframe`}
            >
              {tf}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon-touch"
          onClick={onClose}
          aria-label="Close chart panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
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
  const selectedOptions = selection.map((sel) => {
    const option = catalog.find((opt) => opt.key === sel.key);
    return {
      ...sel,
      label: option?.label ?? sel.key.toUpperCase(),
      defaultPeriod: option?.defaultPeriod,
    };
  });
  const inactiveOptions = catalog.filter(
    (opt) => !selection.some((sel) => sel.key === opt.key),
  );
  const isAtLimit = selection.length >= 8;

  return (
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-3 sm:flex-wrap">
      <div className="mr-1 flex min-h-11 shrink-0 flex-col justify-center sm:min-h-9">
        <span className="text-xs font-medium text-muted-foreground">
          Indicators
        </span>
        <span className="data-text text-[11px] text-muted-foreground" aria-live="polite">
          {selection.length}/8 active
        </span>
      </div>

      {selectedOptions.map((sel) => (
        <div
          key={sel.key}
          className="flex min-h-11 max-w-[16rem] shrink-0 items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 text-xs sm:max-w-full"
        >
          <span className="min-w-0 max-w-32 truncate font-medium" title={sel.label}>
            {sel.label}
          </span>
          {sel.defaultPeriod != null && sel.period != null && (
            <input
              type="number"
              min={1}
              max={MAX_INDICATOR_PERIOD}
              value={sel.period}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) onPeriodChange(sel.key, clampPeriod(v));
              }}
              onBlur={(e) => {
                const v = Number(e.target.value);
                onPeriodChange(sel.key, Number.isFinite(v) ? clampPeriod(v) : 1);
              }}
              className="h-11 w-16 rounded border border-input bg-background px-1 text-xs data-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring sm:h-9 sm:w-14"
              aria-label={`${sel.label} lookback period`}
            />
          )}
          <button
            type="button"
            onClick={() => onToggle(sel.key, sel.defaultPeriod)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring sm:h-8 sm:w-8"
            aria-label={`Remove ${sel.label}`}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="touch"
            className="px-3 text-xs"
            disabled={inactiveOptions.length === 0 || isAtLimit}
            aria-label={
              isAtLimit
                ? "Indicator limit reached"
                : "Add chart indicator"
            }
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {inactiveOptions.map((opt) => (
            <DropdownMenuItem
              key={opt.key}
              onSelect={() => onToggle(opt.key, opt.defaultPeriod)}
              disabled={isAtLimit}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {isAtLimit && (
        <span className="min-h-11 shrink-0 content-center text-xs text-muted-foreground sm:min-h-9">
          Indicator limit reached
        </span>
      )}
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
  const hasCandles = candles.length > 0;

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
    if (!container || !hasCandles || container.clientWidth === 0) return;

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

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      if (width > 0) chart.applyOptions({ width });
    });
    resizeObserver.observe(container);

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        onFocus(null);
        return;
      }
      const c = candleByTime.get(chartTimeKey(param.time));
      if (c) onFocus(c);
    });

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      priceChartRef.current = null;
    };
    // theme intentionally included so we rebuild on dark-mode toggle
  }, [candles, priceSeries, theme, candleByTime, onFocus, timeframe, hasCandles]);

  // Oscillator pane (separate chart instance)
  useEffect(() => {
    const container = oscillatorContainerRef.current;
    if (!container || oscillatorSeries.length === 0 || container.clientWidth === 0) {
      return;
    }

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

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      if (width > 0) chart.applyOptions({ width });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      oscChartRef.current = null;
    };
  }, [oscillatorSeries, theme, timeframe]);

  return (
    <div className="space-y-2">
      <div
        ref={priceContainerRef}
        className="min-h-[360px]"
        aria-label="Candlestick price chart"
      />
      {oscillatorSeries.length > 0 && (
        <div
          ref={oscillatorContainerRef}
          className="min-h-[140px]"
          aria-label="Selected indicator chart"
        />
      )}
    </div>
  );
}

// --- supporting blocks ----------------------------------------------------

function ChartDataSummary({
  asset,
  timeframe,
  candles,
  selectedCandle,
  priceSeries,
  oscillatorSeries,
  isRefreshing,
}: {
  asset: string | null;
  timeframe: string;
  candles: ChartCandle[];
  selectedCandle: ChartCandle | null;
  priceSeries: IndicatorSeries[];
  oscillatorSeries: IndicatorSeries[];
  isRefreshing: boolean;
}) {
  const activeSeries = [...priceSeries, ...oscillatorSeries];
  const range = useMemo(() => {
    if (candles.length === 0) return null;
    let low = candles[0].low;
    let high = candles[0].high;
    for (const candle of candles) {
      low = Math.min(low, candle.low);
      high = Math.max(high, candle.high);
    }
    return { low, high };
  }, [candles]);

  return (
    <section
      className="rounded-lg border bg-card p-4 text-xs"
      aria-labelledby="chart-data-summary-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="chart-data-summary-heading" className="text-sm font-medium">
          Chart data
        </h3>
        <span
          className="data-text rounded-md border border-border bg-muted/40 px-2 py-1 text-muted-foreground"
          role="status"
        >
          {isRefreshing ? "Refreshing" : `${candles.length} candles`}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Pair" value={asset ?? "Unknown"} />
        <SummaryItem label="Timeframe" value={timeframe} isData />
        <SummaryItem
          label="Range"
          value={
            range
              ? `${formatNumber(range.low)} to ${formatNumber(range.high)}`
              : "Unknown"
          }
          isData
        />
        <SummaryItem
          label="Indicators"
          value={
            activeSeries.length > 0
              ? activeSeries.map((series) => series.label).join(", ")
              : "None"
          }
        />
      </dl>
      {selectedCandle && <CandleReadout candle={selectedCandle} />}
      <ChartScreenReaderTable
        selectedCandle={selectedCandle}
        activeSeries={activeSeries}
      />
    </section>
  );
}

function SummaryItem({
  label,
  value,
  isData = false,
}: {
  label: string;
  value: string;
  isData?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 break-words text-sm text-foreground",
          isData && "data-text",
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function CandleReadout({ candle }: { candle: ChartCandle }) {
  const items = [
    ["Open", formatNumber(candle.open)],
    ["High", formatNumber(candle.high)],
    ["Low", formatNumber(candle.low)],
    ["Close", formatNumber(candle.close)],
    ["Volume", formatVolume(candle.volume)],
  ];

  return (
    <dl
      className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <div className="data-text font-medium text-foreground">
        <dt className="sr-only">Selected candle time</dt>
        <dd>{formatDateLabel(candle.timestamp)}</dd>
      </div>
      {items.map(([label, value]) => (
        <div key={label} className="flex gap-1">
          <dt>{label}</dt>
          <dd className="data-text text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChartScreenReaderTable({
  selectedCandle,
  activeSeries,
}: {
  selectedCandle: ChartCandle | null;
  activeSeries: IndicatorSeries[];
}) {
  const latestIndicatorRows = activeSeries.map((series) => {
    const latestPoint = [...series.points].reverse().find((p) => p.value !== null);
    return {
      key: series.key,
      label: series.label,
      pane: series.pane,
      value: latestPoint ? formatNumber(latestPoint.value as number) : "No value",
    };
  });

  return (
    <div className="sr-only">
      <table>
        <caption>Accessible chart data fallback</caption>
        <tbody>
          {selectedCandle ? (
            <>
              <tr>
                <th scope="row">Selected candle time</th>
                <td>{formatDateLabel(selectedCandle.timestamp)}</td>
              </tr>
              <tr>
                <th scope="row">Open</th>
                <td>{formatNumber(selectedCandle.open)}</td>
              </tr>
              <tr>
                <th scope="row">High</th>
                <td>{formatNumber(selectedCandle.high)}</td>
              </tr>
              <tr>
                <th scope="row">Low</th>
                <td>{formatNumber(selectedCandle.low)}</td>
              </tr>
              <tr>
                <th scope="row">Close</th>
                <td>{formatNumber(selectedCandle.close)}</td>
              </tr>
              <tr>
                <th scope="row">Volume</th>
                <td>{formatVolume(selectedCandle.volume)}</td>
              </tr>
            </>
          ) : (
            <tr>
              <th scope="row">Selected candle</th>
              <td>No candle selected</td>
            </tr>
          )}
          {latestIndicatorRows.length > 0 ? (
            latestIndicatorRows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                <td>{row.value} on {row.pane} pane</td>
              </tr>
            ))
          ) : (
            <tr>
              <th scope="row">Indicators</th>
              <td>No active indicators</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ChartEmptyState({ asset, timeframe }: { asset: string; timeframe: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <p className="text-sm font-medium">No price candles for this selection.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="break-words">{asset || "This pair"}</span>{" "}
        <span className="data-text">at {timeframe}</span>. Try another pair or
        timeframe when available.
      </p>
    </div>
  );
}

function ChartErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
      role="alert"
    >
      <p className="font-medium text-destructive">Could not load the chart.</p>
      <p className="mt-1 break-words text-muted-foreground">
        {getChartErrorMessage(message)}
      </p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
