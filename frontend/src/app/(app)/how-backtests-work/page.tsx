export default function HowBacktestsWorkPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        How Backtests Work
      </h1>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            What is Backtesting?
          </h2>
          <p>
            Backtesting simulates how your strategy would have performed on
            historical price data. It helps you evaluate your strategy before
            risking real capital.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Important Disclaimer
          </h2>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2 font-medium text-amber-800">
              Simulated results only
            </p>
            <ul className="list-inside list-disc space-y-1 text-amber-700">
              <li>Past performance does not guarantee future results</li>
              <li>Backtests are simulations, not predictions</li>
              <li>Real market conditions may differ significantly</li>
              <li>This is not investment advice</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Data & Execution Model
          </h2>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <strong>Price Data:</strong> Uses OHLCV (Open, High, Low, Close,
              Volume) candle data, not tick-by-tick order book data
            </li>
            <li>
              <strong>Entry/Exit:</strong> Orders execute at the next
              candle&apos;s open price after a signal
            </li>
            <li>
              <strong>Fees:</strong> Configurable trading fee applied per trade
              (default: 0.1%)
            </li>
            <li>
              <strong>Slippage:</strong> Configurable slippage cost per trade
              (default: 0.05%)
            </li>
            <li>
              <strong>Position Sizing:</strong> Fixed percentage of portfolio
              per trade
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            MVP Constraints
          </h2>
          <ul className="list-inside list-disc space-y-2">
            <li>Single asset per strategy (BTC/USDT or ETH/USDT)</li>
            <li>Single timeframe per strategy (1d or 4h)</li>
            <li>Limited indicator set for building strategies</li>
            <li>Simple long-only strategies</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Usage Limits
          </h2>
          <p className="mb-2">
            To ensure fair access during beta, we have soft limits in place:
          </p>
          <ul className="list-inside list-disc space-y-2">
            <li>Up to 10 active strategies (archive unused ones to free slots)</li>
            <li>Up to 50 backtests per day (resets at midnight UTC)</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
