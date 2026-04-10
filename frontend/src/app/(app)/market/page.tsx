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
import { TrendingUp, TrendingDown, Info, Search, X, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { MarketSentimentPanel } from "@/components/MarketSentimentPanel";
import type { TickerItem } from "@/types/market";

type SortKey = "pair" | "price" | "change_24h_pct" | "volume_24h" | "volatility_percentile_1y";
type SortDir = "asc" | "desc";

const VOL_STD_HELP = "Standard deviation of recent daily returns — higher means wider price swings.";
const VOL_ATR_HELP = "Average True Range as a percentage of price — typical daily range.";
const VOL_PCTILE_HELP = "Percentile compares today's volatility to the last year.";

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
  const { tickers, asOf, isLoading, error, refresh } = useMarketTickers();
  const { timezone } = useDisplay();

  const filteredTickers = useMemo(() => {
    const base = !filter
      ? tickers
      : tickers.filter((t) => t.pair.toUpperCase().includes(filter.toUpperCase()));

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

  const header = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Market Overview</h1>
        {asOf && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Last updated: <span className="data-text">{formatDateTime(asOf, timezone)}</span>
          </p>
        )}
      </div>
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter pairs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-8 pr-8"
          aria-label="Filter pairs"
        />
        {filter && (
          <button
            type="button"
            onClick={() => setFilter("")}
            className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Clear filter"
          >
            <X className="h-4 w-4" />
          </button>
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

  if (error) {
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

  return (
    <TooltipProvider>
      <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        {header}

        {filter && (
          <p className="text-xs text-muted-foreground -mt-3">
            Showing {shownCount} of {totalCount} pairs
          </p>
        )}

        {/* Market Sentiment Panel */}
        <MarketSentimentPanel asset="BTC/USDT" />

        {isEmpty ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-medium">
              {filter ? `No pairs match "${filter}"` : "No market data available"}
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
          <>
            {/* Desktop: Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        type="button"
                        onClick={() => toggleSort("pair")}
                        className="font-medium hover:text-foreground"
                      >
                        Pair<SortIcon active={sortKey === "pair"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort("price")}
                        className="font-medium hover:text-foreground"
                      >
                        Price<SortIcon active={sortKey === "price"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort("change_24h_pct")}
                        className="font-medium hover:text-foreground"
                      >
                        24h Change<SortIcon active={sortKey === "change_24h_pct"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort("volume_24h")}
                        className="font-medium hover:text-foreground"
                      >
                        24h Volume<SortIcon active={sortKey === "volume_24h"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      Vol (Std)<InfoTip text={VOL_STD_HELP} />
                    </TableHead>
                    <TableHead className="text-right">
                      Vol (ATR%)<InfoTip text={VOL_ATR_HELP} />
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort("volatility_percentile_1y")}
                        className="font-medium hover:text-foreground"
                      >
                        Vol %ile<SortIcon active={sortKey === "volatility_percentile_1y"} dir={sortDir} />
                      </button>
                      <InfoTip text={VOL_PCTILE_HELP} />
                    </TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickers.map((ticker) => {
                    const positive = ticker.change_24h_pct >= 0;
                    return (
                      <TableRow key={ticker.pair}>
                        <TableCell className="data-text font-medium">{ticker.pair}</TableCell>
                        <TableCell className="data-text text-right">
                          {formatPrice(ticker.price, "USDT")}
                        </TableCell>
                        <TableCell
                          className={`data-text text-right ${positive ? "text-success" : "text-destructive"}`}
                        >
                          {positive ? "+" : ""}{formatPercent(ticker.change_24h_pct)}
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
                          {positive ? (
                            <TrendingUp className="inline-block w-5 h-5 text-success" aria-label="Up" />
                          ) : (
                            <TrendingDown className="inline-block w-5 h-5 text-destructive" aria-label="Down" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: Cards */}
            <div className="space-y-3 md:hidden">
              {filteredTickers.map((ticker) => {
                const positive = ticker.change_24h_pct >= 0;
                return (
                  <Card key={ticker.pair}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="data-text text-lg font-medium">{ticker.pair}</span>
                        <span
                          className={`data-text inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium ${
                            positive
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {positive ? (
                            <TrendingUp className="w-4 h-4" aria-label="Up" />
                          ) : (
                            <TrendingDown className="w-4 h-4" aria-label="Down" />
                          )}
                          {positive ? "+" : ""}{formatPercent(ticker.change_24h_pct)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Price</p>
                          <p className="data-text font-medium">
                            {formatPrice(ticker.price, "USDT")}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground">24h Volume</p>
                          <p className="data-text font-medium">{formatNumber(ticker.volume_24h, 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Vol (Std)<InfoTip text={VOL_STD_HELP} />
                          </p>
                          <p className="data-text font-medium">
                            {formatVolatility(ticker.volatility_stddev, 3)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Vol (ATR%)<InfoTip text={VOL_ATR_HELP} />
                          </p>
                          <p className="data-text font-medium">
                            {formatVolatility(ticker.volatility_atr_pct, 1)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground">
                            Vol Percentile (1y)<InfoTip text={VOL_PCTILE_HELP} />
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
          </>
        )}
      </main>
    </TooltipProvider>
  );
}
