"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { MarketSentimentPanel } from "@/components/MarketSentimentPanel";

export default function MarketPage() {
  const [selectedAsset, setSelectedAsset] = useState<string>("BTC/USDT");
  const { tickers, asOf, isLoading, error } = useMarketTickers();
  const { timezone } = useDisplay();

  if (isLoading) {
    return (
      <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold">Market Overview</h1>
        </div>
        <p className="text-muted-foreground">Loading market data...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold">Market Overview</h1>
        </div>
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Market data temporarily unavailable. Please try again later.
        </div>
      </main>
    );
  }

  return (
    <TooltipProvider>
      <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Market Overview</h1>
            {asOf && (
              <p className="text-sm text-muted-foreground">
                Last updated: {formatDateTime(asOf, timezone)}
              </p>
            )}
          </div>
          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
              <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
            </SelectContent>
          </Select>
        </div>

      {/* Market Sentiment Panel */}
      <MarketSentimentPanel asset={selectedAsset} />

      {/* Desktop: Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pair</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">24h Change</TableHead>
              <TableHead className="text-right">24h Volume</TableHead>
              <TableHead className="text-right">Vol (Std)</TableHead>
              <TableHead className="text-right">Vol (ATR%)</TableHead>
              <TableHead className="text-right">
                Vol %ile
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="inline-block ml-1 w-3 h-3 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Percentile compares today&apos;s volatility to the last year</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-center">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickers.map((ticker) => (
              <TableRow key={ticker.pair}>
                <TableCell className="font-medium">{ticker.pair}</TableCell>
                <TableCell className="text-right">
                  {formatPrice(ticker.price, "USDT")}
                </TableCell>
                <TableCell
                  className={`text-right ${
                    ticker.change_24h_pct >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatPercent(ticker.change_24h_pct)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(ticker.volume_24h, 0)}
                </TableCell>
                <TableCell className="text-right">
                  {formatVolatility(ticker.volatility_stddev, 3)}
                </TableCell>
                <TableCell className="text-right">
                  {formatVolatility(ticker.volatility_atr_pct, 1)}
                </TableCell>
                <TableCell className="text-right">
                  {formatVolatility(ticker.volatility_percentile_1y, 0)}
                </TableCell>
                <TableCell className="text-center">
                  {ticker.change_24h_pct >= 0 ? (
                    <TrendingUp className="inline-block w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="inline-block w-5 h-5 text-red-600" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Cards */}
      <div className="space-y-3 md:hidden">
        {tickers.map((ticker) => (
          <Card key={ticker.pair}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-lg">{ticker.pair}</span>
                {ticker.change_24h_pct >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-medium">
                    {formatPrice(ticker.price, "USDT")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">24h Change</p>
                  <p
                    className={`font-medium ${
                      ticker.change_24h_pct >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatPercent(ticker.change_24h_pct)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">24h Volume</p>
                  <p className="font-medium">{formatNumber(ticker.volume_24h, 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vol (Std)</p>
                  <p className="font-medium">
                    {formatVolatility(ticker.volatility_stddev, 3)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vol (ATR%)</p>
                  <p className="font-medium">
                    {formatVolatility(ticker.volatility_atr_pct, 1)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">
                    Vol Percentile (1y)
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="inline-block ml-1 w-3 h-3 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Percentile compares today&apos;s volatility to the last year</p>
                      </TooltipContent>
                    </Tooltip>
                  </p>
                  <p className="font-medium">
                    {formatVolatility(ticker.volatility_percentile_1y, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      </main>
    </TooltipProvider>
  );
}
