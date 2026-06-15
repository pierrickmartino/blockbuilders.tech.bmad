import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { formatPercent, formatPrice } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LowTradeCountWarning } from "@/components/LowTradeCountWarning";
import { SharedBacktestHeader } from "./_components/SharedBacktestHeader";
import { SharedBacktestEquityCurve } from "./_components/SharedBacktestEquityCurve";
import { SharedBacktestNarrative } from "./_components/SharedBacktestNarrative";
import { SharedBacktestCostDisclosure } from "./_components/SharedBacktestCostDisclosure";
import { getSharedBacktestView } from "@/lib/shared-backtest/get-shared-backtest-view";
import { buildSharedBacktestMetadata } from "@/lib/shared-backtest/build-shared-backtest-metadata";

interface Props {
  params: Promise<{ token: string }>;
}

// Next.js dedupes identical fetch(url, options) calls within a single
// render, so generateMetadata and the page body share one network read.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await getSharedBacktestView(token);

  return buildSharedBacktestMetadata(data, token);
}

export default async function SharedBacktestPage({ params }: Props) {
  const { token } = await params;
  const data = await getSharedBacktestView(token);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md p-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
          </div>
          <h2 className="mb-1 font-semibold tracking-tight">
            Unable to Load Backtest
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            This share link may have expired or been removed.
          </p>
          <Button variant="outline" asChild>
            <Link href="/">Go to Homepage</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const metrics = [
    { label: "Final Balance", value: formatPrice(data.summary.final_balance) },
    {
      label: "Total Return",
      value: formatPercent(data.summary.total_return_pct),
    },
    { label: "CAGR", value: formatPercent(data.summary.cagr_pct) },
    {
      label: "Max Drawdown",
      value: formatPercent(data.summary.max_drawdown_pct),
    },
    { label: "Trades", value: data.summary.num_trades.toString() },
    { label: "Win Rate", value: formatPercent(data.summary.win_rate_pct) },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <SharedBacktestHeader
          asset={data.asset}
          timeframe={data.timeframe}
          dateFrom={data.date_from}
          dateTo={data.date_to}
        />

        {/* Narrative */}
        <SharedBacktestNarrative narrative={data.narrative} />

        {/* Metrics */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 font-semibold tracking-tight">
              Performance Metrics
            </h2>
            <LowTradeCountWarning numTrades={data.summary.num_trades} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border bg-secondary/50 p-3 dark:bg-secondary/30"
                >
                  <div className="mb-1 text-xs uppercase text-muted-foreground">
                    {metric.label}
                  </div>
                  <div className="text-lg font-semibold tabular-nums tracking-tight">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cost Disclosure */}
        <SharedBacktestCostDisclosure
          summary={data.summary}
          feeRate={data.fee_rate}
          slippageRate={data.slippage_rate}
          spreadRate={data.spread_rate}
        />

        {/* Equity Curve */}
        {data.equity_curve.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 font-semibold tracking-tight">
                Equity Curve
              </h2>
              <SharedBacktestEquityCurve equityCurve={data.equity_curve} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
