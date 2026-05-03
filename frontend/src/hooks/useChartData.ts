import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { serializeIndicators } from "@/lib/chart-indicators";
import type { ChartDataResponse } from "@/types/chart";

export interface ChartIndicatorSelection {
  key: string;
  period?: number;
}

interface UseChartDataArgs {
  asset: string | null;
  timeframe: string;
  indicators: ReadonlyArray<ChartIndicatorSelection>;
}

interface UseChartDataResult {
  data: ChartDataResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useChartData({
  asset,
  timeframe,
  indicators,
}: UseChartDataArgs): UseChartDataResult {
  const [data, setData] = useState<ChartDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const indicatorParam = serializeIndicators(indicators);

  const fetchChart = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!asset) {
      setIsLoading(false);
      return;
    }

    const isCurrentRequest = () =>
      isMountedRef.current && requestId === requestIdRef.current;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ asset, timeframe });
      if (indicatorParam) params.set("indicators", indicatorParam);
      const response = await apiFetch<ChartDataResponse>(
        `/market/chart-data?${params.toString()}`,
      );
      if (isCurrentRequest()) {
        setData(response);
        setError(null);
      }
    } catch (err) {
      if (isCurrentRequest()) {
        setError(err instanceof Error ? err.message : "Failed to fetch chart data");
      }
    } finally {
      if (isCurrentRequest()) setIsLoading(false);
    }
  }, [asset, timeframe, indicatorParam]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchChart();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchChart]);

  return { data, isLoading, error, refresh: fetchChart };
}
