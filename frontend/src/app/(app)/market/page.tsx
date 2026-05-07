"use client";

import { useMemo, useState } from "react";
import { useMarketTickers } from "@/hooks/useMarketTickers";
import { formatPrice, formatPercent, formatNumber, formatDateTime, formatVolatility } from "@/lib/format";
import { useDisplay } from "@/context/display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Info, Search, X, ArrowUp, ArrowDown, ArrowUpDown, BarChart3 } from "lucide-react";
import { MarketSentimentPanel } from "@/components/MarketSentimentPanel";
import { MarketChartPanel } from "@/components/MarketChartPanel";
import type { TickerItem } from "@/types/market";

type SortKey = "pair" | "price" | "change_24h_pct" | "volume_24h" | "volatility_percentile_1y";
type SortDir = "asc" | "desc";

const VOL_STD_HELP = "How much daily returns have moved recently. Higher values mean wider price swings.";
const VOL_ATR_HELP = "The asset's typical daily trading range as a percentage of price.";
const VOL_PCTILE_HELP = "Where today's volatility sits compared with the last year. 100 means unusually volatile.";

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="inline-block ml-1 w-3 h-3 cursor-help text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="inline-block ml-1 w-3 h-3 opacity-40" />;
  return dir === "asc"
    ? <ArrowUp className="inline-block ml-1 w-3 h-3" />
    : <ArrowDown className="inline-block ml-1 w-3 h-3" />;
}

function sortLabel(label: string, key: SortKey, activeKey: SortKey, dir: SortDir) {
  if (key !== activeKey) return `Sort ${label}`;
  return `${label} is sorted ${dir === "asc" ? "ascending" : "descending"}. Activate to reverse.`;
}

function ariaSortFor(key: SortKey, activeKey: SortKey, dir: SortDir) {
  if (key !== activeKey) return "none";
  return dir === "asc" ? "ascending" : "descending";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function changeTextClass(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return "text-muted-foreground";
  return value >= 0 ? "text-success" : "text-destructive";
}

function changePillClass(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return "bg-muted text-muted-foreground";
  return value >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive";
}

function formatSignedPercent(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return formatPercent(value);
  return `${value >= 0 ? "+" : ""}${formatPercent(value)}`;
}

function DirectionIcon({
  value,
  className = "inline-block w-5 h-5",
}: {
  value: number | null | undefined;
  className?: string;
}) {
  if (!isFiniteNumber(value)) {
    return (
      <ArrowUpDown
        className={`${className} text-muted-foreground`}
        aria-label="24 hour direction unavailable"
      />
    );
  }

  return value >= 0 ? (
    <TrendingUp className={`${className} text-success`} aria-label="Up over 24 hours" />
  ) : (
    <TrendingDown className={`${className} text-destructive`} aria-label="Down over 24 hours" />
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function MarketPage() {
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("volume_24h");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [inspectedAsset, setInspectedAsset] = useState<string | null>(null);
  const { tickers, asOf, isLoading, error, refresh } = useMarketTickers();
  const { timezone } = useDisplay();
  const searchStatusId = "market-search-status";

  const filteredTickers = useMemo(() => {
    const normalizedFilter = filter.trim().toLocaleUpperCase();
    const base = !filter
      ? tickers
      : tickers.filter((t) =>
          t.pair.toLocaleUpperCase().includes(normalizedFilter),
        );

    const sorted = [...base].sort((a, b) => {
      const av = a[sortKey as keyof TickerItem];
      const bv = b[sortKey as keyof TickerItem];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return sorted;
  }, [tickers, filter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "pair" ? "asc" : "desc");
    }
  };

  const mobileSortOptions: Array<{ key: SortKey; label: string }> = [
    { key: "volume_24h", label: "Volume" },
    { key: "change_24h_pct", label: "24h" },
    { key: "price", label: "Price" },
    { key: "volatility_percentile_1y", label: "Vol rank" },
  ];

  const header = (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Market Overview</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Scan pairs, compare volatility, then inspect candles before building or backtesting.
        </p>
        {asOf && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Last updated: <span className="data-text">{formatDateTime(asOf, timezone)}</span>
          </p>
        )}
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-72">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pair, for example BTC"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-11 pl-9 pr-12 sm:h-10"
            aria-label="Search market pairs"
            aria-describedby={filter ? searchStatusId : undefined}
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter("")}
              className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring sm:right-1.5 sm:top-1.5 sm:h-7 sm:w-7"
              aria-label="Clear filter"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {filter && (
          <p
            id={searchStatusId}
            className="text-xs text-muted-foreground"
            aria-live="polite"
          >
            {filteredTickers.length} of {tickers.length} pairs match your search
          </p>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        {header}
        <TableSkeleton />
      </main>
    );
  }

  if (error && tickers.length === 0) {
    return (
      <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        {header}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Market data temporarily unavailable.</p>
          <p className="mt-1 text-muted-foreground">Check your connection and try again.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => refresh()}
          >
            Retry
          </Button>
        </div>
      </main>
    );
  }

  const isEmpty = filteredTickers.length === 0;
  const totalCount = tickers.length;
  const shownCount = filteredTickers.length;
  const hasBackgroundError = Boolean(error && tickers.length > 0);

  return (
    <TooltipProvider>
      <main className="container mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        {header}

        {hasBackgroundError && (
          <div
            className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm"
            role="status"
          >
            <p className="font-medium text-warning-foreground">
              Showing the latest market data we have.
            </p>
            <p className="mt-1 break-words text-muted-foreground">
              A background refresh failed. Check your connection or retry.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => refresh()}
            >
              Retry
            </Button>
          </div>
        )}

        {isEmpty ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="break-words text-sm font-medium">
              {filter ? (
                <>
                  No pairs match <span className="data-text">{filter}</span>
                </>
              ) : (
                "No market pairs available"
              )}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter ? "Try a symbol like BTC, ETH, or SOL." : "Market data has not loaded yet. Try refreshing shortly."}
            </p>
            {filter && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setFilter("")}
              >
                Clear filter
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
            <section aria-labelledby="market-list-heading" className="min-w-0">
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-1">
                    <h2 id="market-list-heading" className="text-lg font-semibold">
                      Market Pairs
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Sort the list, then open a pair to inspect candles and indicators.
                    </p>
                  </div>
                  <p className="data-text text-sm text-muted-foreground">
                    {shownCount} of {totalCount} pairs
                  </p>
                </div>

                <div
                  className="flex gap-2 overflow-x-auto border-b border-border p-3 md:hidden"
                  aria-label="Market sort controls"
                >
                  {mobileSortOptions.map((option) => {
                    const active = sortKey === option.key;
                    return (
                      <Button
                        key={option.key}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="touch"
                        className="shrink-0 px-3 text-xs"
                        onClick={() => toggleSort(option.key)}
                        aria-pressed={active}
                        aria-label={sortLabel(option.label, option.key, sortKey, sortDir)}
                      >
                        {option.label}
                        <SortIcon active={active} dir={sortDir} />
                      </Button>
                    );
                  })}
                </div>

                {/* Desktop: Table */}
                <div className="hidden md:block">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead aria-sort={ariaSortFor("pair", sortKey, sortDir)}>
                      <button
                        type="button"
                        onClick={() => toggleSort("pair")}
                        className="inline-flex min-h-9 items-center rounded-md font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                        aria-label={sortLabel("pair", "pair", sortKey, sortDir)}
                      >
                        Pair<SortIcon active={sortKey === "pair"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right" aria-sort={ariaSortFor("price", sortKey, sortDir)}>
                      <button
                        type="button"
                        onClick={() => toggleSort("price")}
                        className="inline-flex min-h-9 items-center rounded-md font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                        aria-label={sortLabel("price", "price", sortKey, sortDir)}
                      >
                        Price<SortIcon active={sortKey === "price"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right" aria-sort={ariaSortFor("change_24h_pct", sortKey, sortDir)}>
                      <button
                        type="button"
                        onClick={() => toggleSort("change_24h_pct")}
                        className="inline-flex min-h-9 items-center rounded-md font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                        aria-label={sortLabel("24h change", "change_24h_pct", sortKey, sortDir)}
                      >
                        24h Change<SortIcon active={sortKey === "change_24h_pct"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right" aria-sort={ariaSortFor("volume_24h", sortKey, sortDir)}>
                      <button
                        type="button"
                        onClick={() => toggleSort("volume_24h")}
                        className="inline-flex min-h-9 items-center rounded-md font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                        aria-label={sortLabel("24h volume", "volume_24h", sortKey, sortDir)}
                      >
                        24h Volume<SortIcon active={sortKey === "volume_24h"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      Return Vol<InfoTip text={VOL_STD_HELP} />
                    </TableHead>
                    <TableHead className="text-right">
                      ATR Range<InfoTip text={VOL_ATR_HELP} />
                    </TableHead>
                    <TableHead className="text-right" aria-sort={ariaSortFor("volatility_percentile_1y", sortKey, sortDir)}>
                      <button
                        type="button"
                        onClick={() => toggleSort("volatility_percentile_1y")}
                        className="inline-flex min-h-9 items-center rounded-md font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                        aria-label={sortLabel("1 year volatility rank", "volatility_percentile_1y", sortKey, sortDir)}
                      >
                        1Y Vol Rank<SortIcon active={sortKey === "volatility_percentile_1y"} dir={sortDir} />
                      </button>
                      <InfoTip text={VOL_PCTILE_HELP} />
                    </TableHead>
                    <TableHead className="text-center">24h Direction</TableHead>
                    <TableHead className="text-right">Inspect</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickers.map((ticker) => {
                    return (
                      <TableRow key={ticker.pair} className="group">
                        <TableCell className="data-text max-w-40 font-medium">
                          <button
                            type="button"
                            onClick={() => setInspectedAsset(ticker.pair)}
                            className="min-h-9 max-w-full truncate rounded-md text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                            aria-label={`Open chart for ${ticker.pair}`}
                            title={ticker.pair}
                          >
                            {ticker.pair}
                          </button>
                        </TableCell>
                        <TableCell className="data-text text-right">
                          {formatPrice(ticker.price, "USDT")}
                        </TableCell>
                        <TableCell
                          className={`data-text text-right ${changeTextClass(ticker.change_24h_pct)}`}
                        >
                          {formatSignedPercent(ticker.change_24h_pct)}
                        </TableCell>
                        <TableCell className="data-text text-right">
                          {formatNumber(ticker.volume_24h, 0)}
                        </TableCell>
                        <TableCell className="data-text text-right">
                          {formatVolatility(ticker.volatility_stddev, 3)}
                        </TableCell>
                        <TableCell className="data-text text-right">
                          {formatVolatility(ticker.volatility_atr_pct, 1)}
                        </TableCell>
                        <TableCell className="data-text text-right">
                          {formatVolatility(ticker.volatility_percentile_1y, 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          <DirectionIcon value={ticker.change_24h_pct} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground transition-colors group-hover:text-foreground"
                            onClick={() => setInspectedAsset(ticker.pair)}
                            aria-label={`Open ${ticker.pair} chart`}
                          >
                            <BarChart3 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

                {/* Mobile: Cards */}
                <div className="space-y-3 bg-background p-3 md:hidden">
              {filteredTickers.map((ticker) => {
                return (
                  <Card key={ticker.pair} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setInspectedAsset(ticker.pair)}
                          className="data-text min-h-11 min-w-0 truncate rounded-md text-left text-lg font-medium hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                          aria-label={`Open chart for ${ticker.pair}`}
                          title={ticker.pair}
                        >
                          {ticker.pair}
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`data-text inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm font-medium ${
                              changePillClass(ticker.change_24h_pct)
                            }`}
                          >
                            <DirectionIcon value={ticker.change_24h_pct} className="h-4 w-4" />
                            {formatSignedPercent(ticker.change_24h_pct)}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-touch"
                            onClick={() => setInspectedAsset(ticker.pair)}
                            aria-label={`Open ${ticker.pair} chart`}
                          >
                            <BarChart3 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Price</p>
                          <p className="data-text font-medium">
                            {formatPrice(ticker.price, "USDT")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">24h Volume</p>
                          <p className="data-text font-medium">{formatNumber(ticker.volume_24h, 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Return Vol<InfoTip text={VOL_STD_HELP} />
                          </p>
                          <p className="data-text font-medium">
                            {formatVolatility(ticker.volatility_stddev, 3)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            ATR Range<InfoTip text={VOL_ATR_HELP} />
                          </p>
                          <p className="data-text font-medium">
                            {formatVolatility(ticker.volatility_atr_pct, 1)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">
                            1Y Vol Rank<InfoTip text={VOL_PCTILE_HELP} />
                          </p>
                          <p className="data-text font-medium">
                            {formatVolatility(ticker.volatility_percentile_1y, 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
                </div>
              </div>
            </section>

            <MarketSentimentPanel asset="BTC/USDT" />
          </div>
        )}

        <MarketChartPanel
          asset={inspectedAsset}
          onClose={() => setInspectedAsset(null)}
        />
      </main>
    </TooltipProvider>
  );
}
