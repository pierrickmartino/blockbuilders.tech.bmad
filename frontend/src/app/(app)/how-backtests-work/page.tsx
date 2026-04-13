import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-semibold leading-none tracking-tight ${className ?? ""}`}
    >
      {children}
    </h2>
  );
}

// Values mirror backend defaults in backend/app/core/config.py and
// backend/app/core/plans.py. Update both when these change.
const DEFAULT_FEE_PCT = "0.1%";
const DEFAULT_SLIPPAGE_PCT = "0.05%";
const MAX_ACTIVE_STRATEGIES = 10;
const MAX_BACKTESTS_PER_DAY = 50;
const LAST_UPDATED = "2026-04-08";

export default function HowBacktestsWorkPage() {
  return (
    <main className="mx-auto max-w-3xl p-4 md:p-6">
      <Link
        href="/backtests"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to backtests
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">
        How Backtests Work
      </h1>
      <p className="mb-6 text-muted-foreground">
        What the engine simulates, what it doesn&apos;t, and the limits you should know.
      </p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <SectionTitle>What is Backtesting?</SectionTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Backtesting simulates how your{" "}
              <Link href="/strategies" className="underline underline-offset-4 hover:text-foreground">
                strategy
              </Link>{" "}
              would have performed on historical price data. It helps you
              evaluate your strategy before risking real capital.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle>Data & Execution Model</SectionTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-outside list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <strong className="text-foreground">Price Data:</strong> Uses OHLCV (Open, High, Low, Close,
                Volume) candle data, not tick-by-tick order book data
              </li>
              <li>
                <strong className="text-foreground">Entry/Exit:</strong> Orders execute at the next
                candle&apos;s open price after a signal
              </li>
              <li>
                <strong className="text-foreground">Fees:</strong> Configurable trading fee applied per trade
                (default: {DEFAULT_FEE_PCT})
              </li>
              <li>
                <strong className="text-foreground">Slippage:</strong> Configurable slippage cost per trade
                (default: {DEFAULT_SLIPPAGE_PCT})
              </li>
              <li>
                <strong className="text-foreground">Position Sizing:</strong> Fixed percentage of portfolio
                per trade
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle>MVP Constraints</SectionTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-outside list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Single asset per strategy (BTC/USDT or ETH/USDT)</li>
              <li>Single timeframe per strategy (1d or 4h)</li>
              <li>Limited indicator set for building strategies</li>
              <li>Simple long-only strategies</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle>Usage Limits</SectionTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-muted-foreground">
              To ensure fair access during beta, we have soft limits in place:
            </p>
            <ul className="list-outside list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                Up to {MAX_ACTIVE_STRATEGIES} active strategies ({" "}
                <Link href="/strategies?status=archived" className="underline underline-offset-4 hover:text-foreground">
                  archive unused ones
                </Link>{" "}
                to free slots)
              </li>
              <li>Up to {MAX_BACKTESTS_PER_DAY} backtests per day (resets at midnight UTC)</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-warning/40 bg-warning/10">
          <CardHeader>
            <SectionTitle className="text-warning">Important Disclaimer</SectionTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 font-medium text-foreground">
              Simulated results only
            </p>
            <ul className="list-outside list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Past performance does not guarantee future results</li>
              <li>Backtests are simulations, not predictions</li>
              <li>Real market conditions may differ significantly</li>
              <li>This is not investment advice</li>
            </ul>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Last updated: {LAST_UPDATED}
        </p>
      </div>
    </main>
  );
}
