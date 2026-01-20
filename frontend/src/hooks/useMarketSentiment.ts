import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { MarketSentimentResponse } from "@/types/market";

const POLL_INTERVAL_MS = 60000; // 60 seconds (cache is 15 min, less frequent than tickers)

export function useMarketSentiment(asset: string = "BTC/USDT") {
  const [sentiment, setSentiment] = useState<MarketSentimentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSentiment = useCallback(async () => {
    try {
      const response = await apiFetch<MarketSentimentResponse>(
        `/market/sentiment?asset=${encodeURIComponent(asset)}`
      );
      setSentiment(response);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch sentiment:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch sentiment data"
      );
    } finally {
      setIsLoading(false);
    }
  }, [asset]);

  useEffect(() => {
    fetchSentiment();

    const interval = setInterval(fetchSentiment, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchSentiment]);

  return {
    sentiment,
    isLoading,
    error,
    refresh: fetchSentiment,
  };
}
