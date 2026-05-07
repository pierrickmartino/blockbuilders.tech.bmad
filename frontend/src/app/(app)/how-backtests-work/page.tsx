import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Database,
  LineChart,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
      className={`font-semibold leading-tight tracking-tight ${className ?? ""}`}
    >
      {children}
    </h2>
  );
}

// Values mirror backend defaults in backend/app/core/config.py and
// backend/app/core/plans.py. Update both when these change.
const DEFAULT_FEE_PCT = "0.1%";
const DEFAULT_SLIPPAGE_PCT = "0.05%";
const DEFAULT_SPREAD_PCT = "0.02%";
const FREE_ACTIVE_STRATEGIES = 10;
const FREE_BACKTESTS_PER_DAY = 50;
const LAST_UPDATED = "2026-04-08";

function DataText({ children }: { children: React.ReactNode }) {
  return <span className="data-text whitespace-nowrap">{children}</span>;
}

function InlineLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-primary underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
    >
      {children}
    </Link>
  );
}

function AssumptionRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 border-t py-3 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[150px_minmax(0,1fr)]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

const modelSteps = [
  "Your connected blocks are evaluated on completed candles.",
  "Signals are converted into simulated entries and exits.",
  "Fees, slippage, and spread are deducted from each trade.",
  "Results are summarized into metrics, equity, and trade history.",
];

export default function HowBacktestsWorkPage() {
  return (
    <article className="mx-auto max-w-5xl p-4 md:p-6">
      <Button asChild variant="ghost" size="touch" className="mb-4 -ml-2 px-2">
        <Link href="/dashboard">
          <ArrowLeft aria-hidden="true" />
          Back to dashboard
        </Link>
      </Button>

      <header className="grid gap-6 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
        <div>
          <Badge variant="outline" className="mb-3">
            Backtest assumptions
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight">
            How Backtests Work
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            How Blockbuilders turns historical candles into simulated trades,
            and where the model stops.
          </p>
        </div>

        <div>
          <dl className="rounded-lg border bg-surface-elevated p-4 text-sm">
            <AssumptionRow
              label="Default costs"
              value={
                <>
                  <DataText>{DEFAULT_FEE_PCT}</DataText> fee,{" "}
                  <DataText>{DEFAULT_SLIPPAGE_PCT}</DataText> slippage,{" "}
                  <DataText>{DEFAULT_SPREAD_PCT}</DataText> spread
                </>
              }
            />
            <AssumptionRow
              label="Execution"
              value="Next candle open after a signal"
            />
            <AssumptionRow label="Reset window" value="Midnight UTC" />
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            The fee is adjustable in run settings. Slippage and spread are fixed
            model defaults.
          </p>
        </div>
      </header>

      <div className="mt-8 space-y-10">
        {/* Core explanation — visually separated from the reference sections below */}
        <section className="grid gap-6 border-b border-border/60 pb-10 md:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] md:items-start">
          <Card variant="raised" className="md:min-h-full">
            <CardHeader>
              <CardTitle>What a Backtest Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="max-w-2xl text-muted-foreground">
                A backtest replays your{" "}
                <InlineLink href="/strategies">strategy</InlineLink> on past
                market candles. It shows how the rules would have behaved with
                the engine&apos;s assumptions, so you can compare ideas before
                risking real capital.
              </p>

              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
                {["Strategy blocks", "Historical candles", "Simulated trades"].map(
                  (item, index) => (
                    <div key={item} className="contents">
                      <span className="min-h-11 rounded-md border bg-background px-3 py-2 text-foreground">
                        {item}
                      </span>
                      {index < 2 && (
                        <>
                          <ArrowRight
                            className="hidden h-4 w-4 text-muted-foreground sm:block"
                            aria-hidden="true"
                          />
                          <ArrowDown
                            className="mx-auto block h-4 w-4 text-muted-foreground sm:hidden"
                            aria-hidden="true"
                          />
                        </>
                      )}
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          <aside className="rounded-lg border bg-card p-5">
            <h2 className="text-sm font-semibold leading-tight">Model path</h2>
            <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
              {modelSteps.map((step, index) => (
                <li key={step} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                  <span className="data-text flex h-7 w-7 items-center justify-center rounded-md border bg-surface-elevated text-xs text-foreground">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        {/* Simulation detail */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LineChart className="h-4 w-4 text-primary" aria-hidden="true" />
                <CardTitle>How Trades Are Simulated</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="list-outside list-disc space-y-3 pl-5 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Market data:</strong> Uses
                  OHLCV candles (open, high, low, close, volume), not
                  tick-by-tick order book data.
                </li>
                <li>
                  <strong className="text-foreground">Entries and exits:</strong>{" "}
                  When a signal appears, the simulated order fills at the next
                  candle&apos;s open price.
                </li>
                <li>
                  <strong className="text-foreground">Fees:</strong> A fixed
                  trading fee is applied to each fill. The default is{" "}
                  <DataText>{DEFAULT_FEE_PCT}</DataText>; run settings can
                  override it.
                </li>
                <li>
                  <strong className="text-foreground">Slippage:</strong> An extra
                  cost applied at entry and exit separately to approximate worse
                  fills. The default is{" "}
                  <DataText>{DEFAULT_SLIPPAGE_PCT}</DataText> per fill.
                </li>
                <li>
                  <strong className="text-foreground">Spread:</strong> A fixed{" "}
                  <DataText>{DEFAULT_SPREAD_PCT}</DataText> spread is included
                  in the transaction-cost breakdown.
                </li>
                <li>
                  <strong className="text-foreground">Position size:</strong> Each
                  trade uses a fixed percentage of the simulated portfolio.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" aria-hidden="true" />
                <CardTitle>Data and Bias Controls</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="list-outside list-disc space-y-3 pl-5 text-muted-foreground">
                <li>
                  Candles are cached in Blockbuilders and filled from
                  CryptoCompare when coverage is incomplete.
                </li>
                <li>
                  Large data gaps stop the run and return an error rather than
                  producing a partial or misleading result.
                </li>
                <li>
                  Signals use completed candles only, which avoids lookahead
                  bias in the strategy evaluation.
                </li>
                <li>
                  Results from very low trade counts should be treated as weak
                  evidence, even when the return looks attractive.
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Reference sections — grouped tighter to signal lower hierarchy than the explanation above */}
        <div className="space-y-6">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div>
              <SectionTitle className="text-lg">Current Limits</SectionTitle>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                The engine is intentionally narrow right now. Constraints make
                comparisons easier to trust while the product keeps improving.
              </p>
            </div>

            <Card>
              <CardContent className="p-5">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>One asset per strategy: BTC/USDT or ETH/USDT.</li>
                  <li>One timeframe per strategy: 1d or 4h.</li>
                  <li>A focused indicator set for building strategies.</li>
                  <li>
                    Long-only positions. Short signals are not executed.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div>
              <SectionTitle className="text-lg">Usage Limits</SectionTitle>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Free accounts start with soft defaults to keep beta access fair.
                Your plan may include higher limits.
              </p>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-4">
                <dt className="text-sm font-medium text-foreground">
                  Active strategies
                </dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  Up to <DataText>{FREE_ACTIVE_STRATEGIES}</DataText> active
                  strategies.{" "}
                  <InlineLink href="/strategies?status=archived">
                    Archive unused ones
                  </InlineLink>{" "}
                  to free slots.
                </dd>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <dt className="text-sm font-medium text-foreground">
                  Daily backtests
                </dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  Up to <DataText>{FREE_BACKTESTS_PER_DAY}</DataText> backtests
                  per day. The counter resets at midnight UTC.
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="rounded-lg border bg-warning-soft p-5">
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <div className="flex items-center gap-2">
                <TriangleAlert
                  className="h-4 w-4 text-warning"
                  aria-hidden="true"
                />
                <SectionTitle className="text-lg">Important Disclaimer</SectionTitle>
              </div>
              <p className="mt-2 font-medium text-foreground">
                Simulated results only.
              </p>
            </div>
            <ul className="list-outside list-disc space-y-2 pl-5 text-foreground">
              <li>
                Backtests are simulations and do not guarantee future results.
              </li>
              <li>
                Real fills, liquidity, outages, and market conditions can differ
                from the model.
              </li>
              <li>
                Use results to compare strategy assumptions, not as predictions.
              </li>
              <li>This is not investment advice.</li>
            </ul>
          </div>
        </section>

        {/* Onward path — connects the reader to action after reading */}
        <section className="rounded-lg border bg-surface-elevated p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <span className="font-medium text-foreground">
                These assumptions apply to every backtest you run.
              </span>{" "}
              <span className="text-muted-foreground">
                Review your strategy settings to confirm they align before
                running.
              </span>
            </p>
            <Button asChild size="sm" className="shrink-0">
              <Link href="/strategies">
                Go to strategies
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t pt-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Last updated: <DataText>{LAST_UPDATED}</DataText>
          </p>
          <p className="flex items-center gap-2 font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Compare assumptions before comparing returns.
          </p>
        </footer>
      </div>
    </article>
  );
}
