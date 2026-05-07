import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import type { MarketSentimentResponse } from "@/types/market";

const POLL_INTERVAL_MS = 60000; // 60 seconds (cache is 15 min, less frequent than tickers)

export function useMarketSentiment(asset: string = "BTC/USDT") {
  const [sentiment, setSentiment] = useState<MarketSentimentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const fetchSentiment = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const isCurrentRequest = () =>
      isMountedRef.current && requestId === requestIdRef.current;

    try {
      const response = await apiFetch<MarketSentimentResponse>(
        `/market/sentiment?asset=${encodeURIComponent(asset)}`
      );
      if (isCurrentRequest()) {
        setSentiment(response);
        setError(null);
      }
    } catch (err) {
      if (isCurrentRequest()) {
        console.error("Failed to fetch sentiment:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch sentiment data"
        );
      }
    } finally {
      if (isCurrentRequest()) {
        setIsLoading(false);
      }
    }
  }, [asset]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchSentiment();

    const interval = setInterval(fetchSentiment, POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchSentiment]);

  return {
    sentiment,
    isLoading,
    error,
    refresh: fetchSentiment,
  };
}
