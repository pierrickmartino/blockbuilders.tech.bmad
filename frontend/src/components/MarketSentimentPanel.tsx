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
  "rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm";
const HEADING_ID = "market-sentiment-heading";
const LONG_SHORT_COLOR = "hsl(var(--chart-1))";
const FUNDING_COLOR = "hsl(var(--chart-2))";

function SentimentNarrative({ sentiment }: { sentiment: MarketSentimentResponse }) {
  const value = sentiment.fear_greed.value;
  const statuses = Object.values(sentiment.source_status);
  const anyDegraded = statuses.some((s) => s !== "ok");
  const qualifier = anyDegraded ? "mixed signals" : "high confidence";

  if (value === null) {
    return <p>Sentiment score unavailable.</p>;
  }

  if (value >= 60) {
    return (
      <p>
        <span aria-hidden="true">📈 </span>
        Market sentiment: <span className="font-medium">Risk-on</span> ({qualifier})
      </p>
    );
  }

  if (value <= 40) {
    return (
      <p>
        <span aria-hidden="true">📉 </span>
        Market sentiment: <span className="font-medium">Risk-off</span> ({anyDegraded ? qualifier : "cautious"})
      </p>
    );
  }

  return (
    <p>
      <span aria-hidden="true">⚖️ </span>
      Market sentiment: <span className="font-medium">Neutral</span> — no strong directional bias
    </p>
  );
}

export function MarketSentimentPanel({ asset }: MarketSentimentPanelProps) {
  const { sentiment, isLoading, error, refresh } = useMarketSentiment(asset);

  if (isLoading) {
    return (
      <section className={PANEL_CLASS} aria-labelledby={HEADING_ID} aria-busy="true">
        <h2 id={HEADING_ID} className="text-lg font-semibold mb-4">
          Market Sentiment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 rounded-md border border-border bg-muted/40 animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
        <span className="sr-only">Loading sentiment data</span>
      </section>
    );
  }

  if (error) {
    return (
      <section className={PANEL_CLASS} aria-labelledby={HEADING_ID}>
        <h2 id={HEADING_ID} className="text-lg font-semibold mb-4">
          Market Sentiment
        </h2>
        <div className="rounded border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Sentiment data temporarily unavailable.
          </p>
          <button
            type="button"
            onClick={() => refresh()}
            className="mt-2 text-sm font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:text-amber-100 dark:hover:text-amber-50"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!sentiment) return null;

  return (
    <section className={PANEL_CLASS} aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID} className="text-lg font-semibold mb-4">
        Market Sentiment
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4">
        <SentimentGauge
          label="Fear & Greed Index"
          value={sentiment.fear_greed.value}
          min={0}
          max={100}
          status={sentiment.source_status.fear_greed}
          formatter={(v) => formatSentiment(v, "fear_greed")}
        />

        <SentimentSparkline
          label="Long/Short Ratio (7d)"
          history={sentiment.long_short_ratio.history}
          status={sentiment.source_status.long_short_ratio}
          color={LONG_SHORT_COLOR}
          formatter={(v) => formatSentiment(v, "long_short_ratio")}
        />

        <SentimentSparkline
          label="Funding Rate (7d)"
          history={sentiment.funding.history}
          status={sentiment.source_status.funding}
          color={FUNDING_COLOR}
          formatter={(v) => formatSentiment(v, "funding")}
        />
      </div>

      <div className="text-xs text-muted-foreground">
        <SentimentNarrative sentiment={sentiment} />
      </div>
    </section>
  );
}
