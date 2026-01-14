import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { TickerListResponse, TickerItem } from "@/types/market";

const POLL_INTERVAL_MS = 4000; // 4 seconds (middle of 3-5s range)

export function useMarketTickers() {
  const [tickers, setTickers] = useState<TickerItem[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickers = useCallback(async () => {
    try {
      const response = await apiFetch<TickerListResponse>("/market/tickers");
      setTickers(response.items);
      setAsOf(response.as_of);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch tickers:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch market data"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickers();

    const interval = setInterval(fetchTickers, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchTickers]);

  return {
    tickers,
    asOf,
    isLoading,
    error,
    refresh: fetchTickers,
  };
}
