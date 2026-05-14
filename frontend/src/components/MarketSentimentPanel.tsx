"use client";

import { useMarketSentiment } from "@/hooks/useMarketSentiment";
import { SentimentGauge } from "./SentimentGauge";
import { SentimentSparkline } from "./SentimentSparkline";
import { formatSentiment } from "@/lib/format";
import type { MarketSentimentResponse } from "@/types/market";

interface MarketSentimentPanelProps {
  asset: string;
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

function PanelHeader() {
  return (
    <div className="border-b border-border p-4">
      <h2 id={HEADING_ID} className="text-base font-semibold">
        Market Mood
      </h2>
      <p className="text-sm text-muted-foreground">Overall crypto sentiment — not pair-specific</p>
    </div>
  );
}

function SentimentNarrative({ sentiment }: { sentiment: MarketSentimentResponse }) {
  const value = sentiment.fear_greed.value;
  const statuses = Object.values(sentiment.source_status);
  const anyDegraded = statuses.some((s) => s !== "ok");
  const qualifier = anyDegraded ? "some sources are delayed" : "all sources current";

  if (value === null) {
    return <p>Sentiment score is unavailable right now.</p>;
  }

  if (value >= 60) {
    return (
      <p>
        Market mood: <span className="font-medium text-foreground">Risk-on</span>. Use this as context, not a trade signal. {qualifier}.
      </p>
    );
  }

  if (value <= 40) {
    return (
      <p>
        Market mood: <span className="font-medium text-foreground">Risk-off</span>. Use this as context, not a trade signal. {anyDegraded ? qualifier : "sources look cautious"}.
      </p>
    );
  }

  return (
    <p>
      Market mood: <span className="font-medium text-foreground">Neutral</span>. No strong directional bias from these sources.
    </p>
  );
}

export function MarketSentimentPanel({ asset }: MarketSentimentPanelProps) {
  const { sentiment, isLoading, error, refresh } = useMarketSentiment(asset);

  if (isLoading) {
    return (
      <section className={PANEL_CLASS} aria-labelledby={HEADING_ID} aria-busy="true">
        <PanelHeader />
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
        <PanelHeader />
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
  const hasBackgroundError = Boolean(error);

  return (
    <section className={PANEL_CLASS} aria-labelledby={HEADING_ID}>
      <PanelHeader />

      {hasBackgroundError && (
        <div
          className="m-4 rounded-md border border-warning/30 bg-warning-soft p-3"
          role="status"
        >
          <p className="text-sm font-medium text-warning-foreground">
            Showing the latest sentiment data we have.
          </p>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            A background refresh failed. Retry when the connection is stable.
          </p>
          <button
            type="button"
            onClick={() => refresh()}
            className="mt-2 min-h-9 rounded-md text-sm font-medium text-warning-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 divide-y divide-border bg-background md:grid-cols-3 md:divide-x md:divide-y-0 xl:grid-cols-1 xl:divide-x-0 xl:divide-y">
        <SentimentGauge
          label="Fear & Greed Index"
          helpText={FEAR_GREED_HELP}
          value={sentiment.fear_greed.value}
          min={0}
          max={100}
          status={sentiment.source_status.fear_greed}
          formatter={(v) => formatSentiment(v, "fear_greed")}
          subtext={sentiment.fear_greed.value !== null
            ? getFearGreedZone(sentiment.fear_greed.value)
            : undefined}
        />

        <SentimentSparkline
          label="Long/Short Ratio (7d)"
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

      <div className="border-t border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <SentimentNarrative sentiment={sentiment} />
      </div>
    </section>
  );
}
