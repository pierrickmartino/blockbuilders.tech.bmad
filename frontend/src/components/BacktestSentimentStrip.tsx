"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { formatSentiment } from "@/lib/format";
import type { BacktestSentimentResponse } from "@/types/market";

interface BacktestSentimentStripProps {
  runId: string;
}

export function BacktestSentimentStrip({ runId }: BacktestSentimentStripProps) {
  const [sentiment, setSentiment] = useState<BacktestSentimentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSentiment() {
      try {
        const response = await apiFetch<BacktestSentimentResponse>(
          `/backtests/${runId}/sentiment`
        );
        setSentiment(response);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch backtest sentiment:", err);
        setError("Sentiment data unavailable");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSentiment();
  }, [runId]);

  if (isLoading) {
    return (
      <div className="mt-4 text-xs text-gray-500">
        Loading sentiment context...
      </div>
    );
  }

  if (error || !sentiment) {
    return (
      <div className="mt-4 text-xs text-yellow-600">
        ⚠️ Sentiment context unavailable for this backtest period.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded border border-blue-100 bg-blue-50 p-3">
      <h4 className="text-sm font-medium text-gray-900 mb-2">
        Sentiment During Backtest
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Fear & Greed */}
        {sentiment.source_status.fear_greed === "ok" && (
          <div>
            <div className="text-gray-600 mb-1">Fear & Greed</div>
            <div className="font-medium">
              Start: {formatSentiment(sentiment.fear_greed_start, "fear_greed")}
            </div>
            <div className="font-medium">
              End: {formatSentiment(sentiment.fear_greed_end, "fear_greed")}
            </div>
            <div className="text-gray-600">
              Avg: {sentiment.fear_greed_avg?.toFixed(0) || "—"}
            </div>
          </div>
        )}

        {/* Social Mentions */}
        {sentiment.source_status.mentions === "ok" && (
          <div>
            <div className="text-gray-600 mb-1">Avg Social Activity</div>
            <div className="font-medium text-lg">
              {sentiment.mentions_avg?.toLocaleString() || "—"}
            </div>
          </div>
        )}

        {/* Funding Rate */}
        {sentiment.source_status.funding === "ok" && (
          <div>
            <div className="text-gray-600 mb-1">Avg Funding Rate</div>
            <div className="font-medium text-lg">
              {formatSentiment(sentiment.funding_avg, "funding")}
            </div>
          </div>
        )}
      </div>

      {/* Unavailable badges */}
      <div className="flex gap-2 mt-2">
        {sentiment.source_status.fear_greed !== "ok" && (
          <Badge variant="outline" className="text-xs">Fear & Greed unavailable</Badge>
        )}
        {sentiment.source_status.mentions !== "ok" && (
          <Badge variant="outline" className="text-xs">Social data unavailable</Badge>
        )}
        {sentiment.source_status.funding !== "ok" && (
          <Badge variant="outline" className="text-xs">Funding unavailable</Badge>
        )}
      </div>
    </div>
  );
}
