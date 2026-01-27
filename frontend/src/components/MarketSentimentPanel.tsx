"use client";

import { useMarketSentiment } from "@/hooks/useMarketSentiment";
import { SentimentGauge } from "./SentimentGauge";
import { SentimentSparkline } from "./SentimentSparkline";
import { formatSentiment } from "@/lib/format";

interface MarketSentimentPanelProps {
  asset: string;
}

export function MarketSentimentPanel({ asset }: MarketSentimentPanelProps) {
  const { sentiment, isLoading, error } = useMarketSentiment(asset);

  if (isLoading) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Market Sentiment</h2>
        <p className="text-sm text-muted-foreground">Loading sentiment data...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Market Sentiment</h2>
        <div className="rounded border border-yellow-200 bg-yellow-50 p-3">
          <p className="text-sm text-yellow-800">
            Sentiment data temporarily unavailable. Showing price data only.
          </p>
        </div>
      </section>
    );
  }

  if (!sentiment) return null;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm mb-6">
      <h2 className="text-lg font-semibold mb-4">Market Sentiment</h2>

      {/* Desktop: 3-column grid */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 mb-4">
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
          color="#8b5cf6"
          formatter={(v) => formatSentiment(v, "long_short_ratio")}
        />

        <SentimentSparkline
          label="Funding Rate (7d)"
          history={sentiment.funding.history}
          status={sentiment.source_status.funding}
          color="#059669"
          formatter={(v) => formatSentiment(v, "funding")}
        />
      </div>

      {/* Mobile: stacked */}
      <div className="md:hidden space-y-3 mb-4">
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
          color="#8b5cf6"
          formatter={(v) => formatSentiment(v, "long_short_ratio")}
        />

        <SentimentSparkline
          label="Funding Rate (7d)"
          history={sentiment.funding.history}
          status={sentiment.source_status.funding}
          color="#059669"
          formatter={(v) => formatSentiment(v, "funding")}
        />
      </div>

      {/* Helper text */}
      <div className="text-xs text-gray-500">
        {sentiment.fear_greed.value !== null && sentiment.fear_greed.value >= 60 && (
          <p>📈 Market sentiment: <span className="font-medium">Risk-on</span> (high confidence)</p>
        )}
        {sentiment.fear_greed.value !== null && sentiment.fear_greed.value <= 40 && (
          <p>📉 Market sentiment: <span className="font-medium">Risk-off</span> (cautious)</p>
        )}
      </div>
    </section>
  );
}
