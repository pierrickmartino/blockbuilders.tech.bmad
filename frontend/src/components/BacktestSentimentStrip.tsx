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
    <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Sentiment During Backtest
          </h4>
          <p className="text-xs text-slate-500">
            Snapshot of market mood indicators during this run.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
        {/* Fear & Greed */}
        {sentiment.source_status.fear_greed === "ok" && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Fear &amp; Greed
              </span>
              <Badge variant="outline" className="text-[10px] text-slate-500">
                Avg {sentiment.fear_greed_avg?.toFixed(0) || "—"}
              </Badge>
            </div>
            <div className="mt-2 grid gap-1 text-sm font-medium text-slate-900">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Start</span>
                <span>{formatSentiment(sentiment.fear_greed_start, "fear_greed")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">End</span>
                <span>{formatSentiment(sentiment.fear_greed_end, "fear_greed")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Long/Short Ratio */}
        {sentiment.source_status.long_short_ratio === "ok" && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Long/Short Ratio
            </span>
            <div className="mt-2 text-lg font-semibold text-slate-900">
              {formatSentiment(sentiment.long_short_ratio_avg, "long_short_ratio")}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Average positioning bias.
            </p>
          </div>
        )}

        {/* Funding Rate */}
        {sentiment.source_status.funding === "ok" && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Funding Rate
            </span>
            <div className="mt-2 text-lg font-semibold text-slate-900">
              {formatSentiment(sentiment.funding_avg, "funding")}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Average cost to hold positions.
            </p>
          </div>
        )}
      </div>

      {/* Unavailable badges */}
      <div className="mt-3 flex flex-wrap gap-2">
        {sentiment.source_status.fear_greed !== "ok" && (
          <Badge variant="outline" className="text-xs">Fear &amp; Greed unavailable</Badge>
        )}
        {sentiment.source_status.long_short_ratio !== "ok" && (
          <Badge variant="outline" className="text-xs">Long/Short data unavailable</Badge>
        )}
        {sentiment.source_status.funding !== "ok" && (
          <Badge variant="outline" className="text-xs">Funding unavailable</Badge>
        )}
      </div>
    </section>
  );
}
