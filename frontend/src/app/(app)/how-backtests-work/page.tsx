import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HowBacktestsWorkPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">
        How Backtests Work
      </h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>What is Backtesting?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Backtesting simulates how your strategy would have performed on
              historical price data. It helps you evaluate your strategy before
              risking real capital.
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">Important Disclaimer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 font-medium text-amber-800">
              Simulated results only
            </p>
            <ul className="list-inside list-disc space-y-1 text-amber-700">
              <li>Past performance does not guarantee future results</li>
              <li>Backtests are simulations, not predictions</li>
              <li>Real market conditions may differ significantly</li>
              <li>This is not investment advice</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data & Execution Model</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
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
                (default: 0.1%)
              </li>
              <li>
                <strong className="text-foreground">Slippage:</strong> Configurable slippage cost per trade
                (default: 0.05%)
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
            <CardTitle>MVP Constraints</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>Single asset per strategy (BTC/USDT or ETH/USDT)</li>
              <li>Single timeframe per strategy (1d or 4h)</li>
              <li>Limited indicator set for building strategies</li>
              <li>Simple long-only strategies</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-muted-foreground">
              To ensure fair access during beta, we have soft limits in place:
            </p>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>Up to 10 active strategies (archive unused ones to free slots)</li>
              <li>Up to 50 backtests per day (resets at midnight UTC)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
