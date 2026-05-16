"use client";

import { useMarketSentiment } from "@/hooks/useMarketSentiment";
import { SentimentGauge } from "./SentimentGauge";
import { SentimentSparkline } from "./SentimentSparkline";
import { formatSentiment } from "@/lib/format";
import type { MarketSentimentResponse } from "@/types/market";

interface MarketSentimentPanelProps {
  asset: string;
  isDefault?: boolean;
}

const PANEL_CLASS =
  "overflow-hidden rounded-lg border border-border bg-card text-card-foreground xl:sticky xl:top-6";
const HEADING_ID = "market-sentiment-heading";
const LONG_SHORT_COLOR = "hsl(var(--chart-1))";
const FUNDING_COLOR = "hsl(var(--chart-2))";

function getFearGreedZone(value: number): string {
  if (value <= 25) return "Extreme Fear";
  if (value <= 45) return "Fear";
  if (value <= 55) return "Neutral";
  if (value <= 75) return "Greed";
  return "Extreme Greed";
}

const FEAR_GREED_HELP =
  "Aggregate index (0–100) measuring crypto market emotion. Below 25 = extreme fear; above 75 = extreme greed. Use as context, not a directional trade signal.";
const LONG_SHORT_HELP =
  "Ratio of accounts holding long vs. short perpetual positions. Above 1.0 = more longs than shorts; below 1.0 = shorts dominate.";
const FUNDING_HELP =
  "Periodic payment exchanged between long and short holders on perpetual contracts. Positive = longs pay shorts (market leaning long); negative = shorts pay longs.";

function StatusDot({ degraded }: { degraded: boolean }) {
  if (!degraded) return null;
  return (
    <span
      className="ml-auto inline-block h-2 w-2 shrink-0 rounded-full bg-warning"
      title="Some sources delayed"
      aria-label="Some data sources are delayed"
    />
  );
}

function PanelHeader({
  asset,
  isDefault,
  degraded,
}: {
  asset: string;
  isDefault?: boolean;
  degraded: boolean;
}) {
  return (
    <div className="border-b border-border p-4">
      <div className="flex items-center gap-2">
        <h2 id={HEADING_ID} className="text-base font-semibold">
          Market Context
        </h2>
        <StatusDot degraded={degraded} />
      </div>
      {isDefault ? (
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="data-text font-medium text-foreground">BTC/USDT</span>{" "}
          &middot; click a pair to update
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Fear &amp; Greed is global &middot; Funding &amp; L/S for{" "}
          <span className="data-text font-medium text-foreground">{asset}</span>
        </p>
      )}
    </div>
  );
}

export function MarketSentimentPanel({ asset, isDefault }: MarketSentimentPanelProps) {
  const { sentiment, isLoading, error, refresh } = useMarketSentiment(asset);

  if (isLoading) {
    return (
      <section className={PANEL_CLASS} aria-labelledby={HEADING_ID} aria-busy="true">
        <PanelHeader asset={asset} isDefault={isDefault} degraded={false} />
        <div className="grid grid-cols-1 gap-3 p-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-md border border-border bg-muted/40"
              aria-hidden="true"
            />
          ))}
        </div>
        <span className="sr-only">Loading sentiment data</span>
      </section>
    );
  }

  if (error && !sentiment) {
    return (
      <section className={PANEL_CLASS} aria-labelledby={HEADING_ID}>
        <PanelHeader asset={asset} isDefault={isDefault} degraded={false} />
        <div className="m-4 rounded-md border border-warning/30 bg-warning-soft p-3">
          <p className="text-sm text-warning-foreground">
            Market mood data is temporarily unavailable.
          </p>
          <button
            type="button"
            onClick={() => refresh()}
            className="mt-2 min-h-9 rounded-md text-sm font-medium text-warning-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!sentiment) return null;

  const statuses = Object.values(sentiment.source_status);
  const anyDegraded = statuses.some((s) => s !== "ok");
  const hasBackgroundError = Boolean(error);

  return (
    <section className={PANEL_CLASS} aria-labelledby={HEADING_ID}>
      <PanelHeader
        asset={asset}
        isDefault={isDefault}
        degraded={anyDegraded || hasBackgroundError}
      />

      <div className="divide-y divide-border bg-background">
        {/* Fear & Greed: hero row */}
        <SentimentGauge
          label="Fear & Greed Index"
          helpText={FEAR_GREED_HELP}
          value={sentiment.fear_greed.value}
          min={0}
          max={100}
          status={sentiment.source_status.fear_greed}
          formatter={(v) => formatSentiment(v, "fear_greed")}
          subtext={
            sentiment.fear_greed.value !== null
              ? getFearGreedZone(sentiment.fear_greed.value)
              : undefined
          }
          size="hero"
        />

        {/* Sparklines: subordinate 2-col row */}
        <div className="grid grid-cols-2 divide-x divide-border">
          <SentimentSparkline
            label="Long/Short (7d)"
            helpText={LONG_SHORT_HELP}
            history={sentiment.long_short_ratio.history}
            status={sentiment.source_status.long_short_ratio}
            color={LONG_SHORT_COLOR}
            formatter={(v) => formatSentiment(v, "long_short_ratio")}
          />

          <SentimentSparkline
            label="Funding Rate (7d)"
            helpText={FUNDING_HELP}
            history={sentiment.funding.history}
            status={sentiment.source_status.funding}
            color={FUNDING_COLOR}
            formatter={(v) => formatSentiment(v, "funding")}
          />
        </div>
      </div>

      {hasBackgroundError && (
        <div className="border-t border-warning/20 bg-warning-soft/50 px-4 py-2 text-xs text-warning-foreground">
          Showing cached data &middot;{" "}
          <button
            type="button"
            onClick={() => refresh()}
            className="underline underline-offset-2 hover:text-foreground focus-visible:outline-none"
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
}
