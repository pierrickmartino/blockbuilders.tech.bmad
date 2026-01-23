import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function StrategyGuidePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">
        Strategy Building Guide
      </h1>

      <div className="space-y-6">
        <Card id="entry-signals">
          <CardHeader>
            <CardTitle>Entry Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-muted-foreground">
              Entry Signals define when to open a position in your strategy. Every strategy must have at least one Entry Signal block.
            </p>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Required:</strong> Every strategy needs at least one Entry Signal block
              </li>
              <li>
                <strong className="text-foreground">Must be connected:</strong> Connect indicators or logic blocks to your Entry Signal to define the entry condition
              </li>
              <li>
                <strong className="text-foreground">How it works:</strong> The strategy opens a position when the Entry Signal condition becomes true
              </li>
              <li>
                <strong className="text-foreground">Example:</strong> Connect an RSI indicator with a Compare block to enter when RSI crosses below 30
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card id="exit-signals">
          <CardHeader>
            <CardTitle>Exit Signals & Exit Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-muted-foreground">
              Exit conditions define when to close an open position. Every strategy must have at least one exit condition.
            </p>
            <p className="mb-3 text-sm font-medium text-foreground">
              You can use either:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Exit Signal block:</strong> A custom exit condition based on indicators and logic (e.g., RSI crosses above 70)
              </li>
              <li>
                <strong className="text-foreground">Risk Management blocks:</strong> Stop Loss, Take Profit, Max Drawdown, Time Exit, or Trailing Stop
              </li>
            </ul>
            <p className="text-muted-foreground">
              You can combine multiple exit conditions. The position closes when the first condition triggers.
            </p>
          </CardContent>
        </Card>

        <Card id="indicators">
          <CardHeader>
            <CardTitle>Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-muted-foreground">
              Indicators analyze price data to generate signals for your strategy.
            </p>
            <p className="mb-3 text-sm font-medium text-foreground">
              Available indicators:
            </p>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">SMA / EMA:</strong> Moving averages with configurable period (1-500)
              </li>
              <li>
                <strong className="text-foreground">RSI:</strong> Relative Strength Index with configurable period (2-100)
              </li>
              <li>
                <strong className="text-foreground">MACD:</strong> Moving Average Convergence Divergence with fast, slow, and signal periods
              </li>
              <li>
                <strong className="text-foreground">Bollinger Bands:</strong> Price envelopes with configurable period and standard deviation
              </li>
              <li>
                <strong className="text-foreground">ATR:</strong> Average True Range with configurable period
              </li>
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              Each indicator has parameter ranges to ensure valid calculations. If you see an error about parameter ranges, adjust the value to fit within the allowed range.
            </p>
          </CardContent>
        </Card>

        <Card id="connections">
          <CardHeader>
            <CardTitle>Block Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-muted-foreground">
              Connections link blocks together to build your strategy logic.
            </p>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">How to connect:</strong> Drag from an output port (right side of a block) to an input port (left side of another block)
              </li>
              <li>
                <strong className="text-foreground">Signal blocks must be connected:</strong> Entry Signal and Exit Signal blocks must have inputs to work properly
              </li>
              <li>
                <strong className="text-foreground">Valid connections:</strong> All connections must reference blocks that exist in your strategy
              </li>
              <li>
                <strong className="text-foreground">Example flow:</strong> Price → SMA → Compare → Entry Signal
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card id="risk-management">
          <CardHeader>
            <CardTitle>Risk Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-muted-foreground">
              Risk management blocks control position sizing and exit conditions to protect your capital.
            </p>
            <p className="mb-3 text-sm font-medium text-foreground">
              Available risk blocks:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Position Size:</strong> Set what percentage of your equity to use per trade (1-100%)
              </li>
              <li>
                <strong className="text-foreground">Stop Loss:</strong> Exit when loss reaches a percentage threshold (0.1-100%)
              </li>
              <li>
                <strong className="text-foreground">Take Profit:</strong> Exit when profit reaches target levels (supports 1-3 ladder levels)
              </li>
              <li>
                <strong className="text-foreground">Max Drawdown:</strong> Exit when equity drawdown exceeds threshold (0.1-100%)
              </li>
              <li>
                <strong className="text-foreground">Time Exit:</strong> Exit after a specific number of bars (minimum 1 bar)
              </li>
              <li>
                <strong className="text-foreground">Trailing Stop:</strong> Exit when price drops by a percentage from the highest close (0-100%)
              </li>
            </ul>
            <p className="mb-3 text-sm font-medium text-foreground">
              Important rules:
            </p>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">One per type:</strong> You can only have one of each risk management block (e.g., one Stop Loss, one Take Profit)
              </li>
              <li>
                <strong className="text-foreground">Take Profit ladder:</strong> When using multiple levels, profit targets must be in ascending order, and total close percentage cannot exceed 100%
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Need More Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700">
              If you&apos;re still seeing validation errors after reading this guide, double-check that all required blocks are present and properly connected. Error messages will point you to the specific block or connection that needs attention.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
