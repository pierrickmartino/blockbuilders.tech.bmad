import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  BacktestStatusResponse,
  EquityCurvePoint,
  Trade,
} from "@/types/backtest";

interface UseBacktestResultsReturn {
  selectedRun: BacktestStatusResponse | null;
  trades: Trade[];
  equityCurve: EquityCurvePoint[];
  benchmarkCurve: EquityCurvePoint[];
  isLoadingTrades: boolean;
  isLoadingEquityCurve: boolean;
  tradesError: string | null;
  equityCurveError: string | null;
  fetchRunDetail: (runId: string) => Promise<BacktestStatusResponse | null>;
  refetchTrades: () => void;
  refetchEquityCurve: () => void;
}

export function useBacktestResults(
  selectedRunId: string | null,
  onRunDetailFetched?: (detail: BacktestStatusResponse) => void
): UseBacktestResultsReturn {
  const [selectedRun, setSelectedRun] = useState<BacktestStatusResponse | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [tradesError, setTradesError] = useState<string | null>(null);

  const [equityCurve, setEquityCurve] = useState<EquityCurvePoint[]>([]);
  const [isLoadingEquityCurve, setIsLoadingEquityCurve] = useState(false);
  const [equityCurveError, setEquityCurveError] = useState<string | null>(null);

  const [benchmarkCurve, setBenchmarkCurve] = useState<EquityCurvePoint[]>([]);

  const fetchRunDetail = useCallback(
    async (runId: string): Promise<BacktestStatusResponse | null> => {
      try {
        const detail = await apiFetch<BacktestStatusResponse>(`/backtests/${runId}`);
        setSelectedRun(detail);
        onRunDetailFetched?.(detail);
        return detail;
      } catch {
        return null;
      }
    },
    [onRunDetailFetched]
  );

  const fetchTrades = useCallback(async (runId: string) => {
    setIsLoadingTrades(true);
    setTradesError(null);
    try {
      const data = await apiFetch<Trade[]>(`/backtests/${runId}/trades`);
      setTrades(data);
    } catch (err) {
      setTradesError(err instanceof Error ? err.message : "Failed to load trades");
      setTrades([]);
    } finally {
      setIsLoadingTrades(false);
    }
  }, []);

  const fetchEquityCurve = useCallback(async (runId: string) => {
    setIsLoadingEquityCurve(true);
    setEquityCurveError(null);
    try {
      const data = await apiFetch<EquityCurvePoint[]>(`/backtests/${runId}/equity-curve`);
      setEquityCurve(data);
    } catch (err) {
      setEquityCurveError(err instanceof Error ? err.message : "Failed to load equity curve");
      setEquityCurve([]);
    } finally {
      setIsLoadingEquityCurve(false);
    }
  }, []);

  const fetchBenchmarkCurve = useCallback(async (runId: string) => {
    try {
      const data = await apiFetch<EquityCurvePoint[]>(`/backtests/${runId}/benchmark-equity-curve`);
      setBenchmarkCurve(data);
    } catch {
      // Silently fail - benchmark is optional
      setBenchmarkCurve([]);
    }
  }, []);

  // Fetch results when run is completed
  useEffect(() => {
    if (selectedRun?.status === "completed" && selectedRunId) {
      fetchTrades(selectedRunId);
      fetchEquityCurve(selectedRunId);
      fetchBenchmarkCurve(selectedRunId);
    } else {
      setTrades([]);
      setTradesError(null);
      setEquityCurve([]);
      setEquityCurveError(null);
      setBenchmarkCurve([]);
    }
  }, [selectedRun?.status, selectedRunId, fetchTrades, fetchEquityCurve, fetchBenchmarkCurve]);

  // Poll for run status when pending/running
  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRun(null);
      return;
    }

    let isActive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      const detail = await fetchRunDetail(selectedRunId);
      if (!detail || !isActive) return;

      if (detail.status === "pending" || detail.status === "running") {
        timer = setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      isActive = false;
      if (timer) clearTimeout(timer);
    };
  }, [selectedRunId, fetchRunDetail]);

  const refetchTrades = useCallback(() => {
    if (selectedRunId) fetchTrades(selectedRunId);
  }, [selectedRunId, fetchTrades]);

  const refetchEquityCurve = useCallback(() => {
    if (selectedRunId) fetchEquityCurve(selectedRunId);
  }, [selectedRunId, fetchEquityCurve]);

  return {
    selectedRun,
    trades,
    equityCurve,
    benchmarkCurve,
    isLoadingTrades,
    isLoadingEquityCurve,
    tradesError,
    equityCurveError,
    fetchRunDetail,
    refetchTrades,
    refetchEquityCurve,
  };
}
