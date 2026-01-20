"use client";

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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Info } from "lucide-react";

export default function MarketPage() {
  const { tickers, asOf, isLoading, error } = useMarketTickers();
  const { timezone } = useDisplay();

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Market Overview</h1>
        <p className="text-muted-foreground">Loading market data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Market Overview</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">
            Market data temporarily unavailable. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Market Overview</h1>
        {asOf && (
          <p className="text-sm text-muted-foreground">
            Last updated: {formatDateTime(asOf, timezone)}
          </p>
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block rounded-lg border">
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
      <div className="md:hidden space-y-3">
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
      </div>
    </TooltipProvider>
  );
}
