import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import type { TickerListResponse, TickerItem } from "@/types/market";

const POLL_INTERVAL_MS = 4000; // 4 seconds (middle of 3-5s range)

export function useMarketTickers() {
  const [tickers, setTickers] = useState<TickerItem[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const fetchTickers = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const isCurrentRequest = () =>
      isMountedRef.current && requestId === requestIdRef.current;

    try {
      const response = await apiFetch<TickerListResponse>("/market/tickers");
      if (isCurrentRequest()) {
        setTickers(response.items);
        setAsOf(response.as_of);
        setError(null);
      }
    } catch (err) {
      if (isCurrentRequest()) {
        console.error("Failed to fetch tickers:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch market data"
        );
      }
    } finally {
      if (isCurrentRequest()) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchTickers();

    const interval = setInterval(fetchTickers, POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchTickers]);

  return {
    tickers,
    asOf,
    isLoading,
    error,
    refresh: fetchTickers,
  };
}
