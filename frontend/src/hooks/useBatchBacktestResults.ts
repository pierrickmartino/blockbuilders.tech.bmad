import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { BacktestStatusResponse, BatchStatusResponse } from "@/types/backtest";

const TERMINAL_STATUSES = new Set(["completed", "failed", "skipped"]);

interface UseBatchBacktestResultsReturn {
  runs: BacktestStatusResponse[];
  isLoading: boolean;
  error: string | null;
  isAllDone: boolean;
}

export function useBatchBacktestResults(
  batchId: string | null
): UseBatchBacktestResultsReturn {
  const [runs, setRuns] = useState<BacktestStatusResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAllDone = runs.length > 0 && runs.every((r) => TERMINAL_STATUSES.has(r.status));

  const fetchBatchStatus = useCallback(async (id: string) => {
    try {
      const data = await apiFetch<BatchStatusResponse>(`/backtests/batch/${id}`);
      setRuns(data.runs);
      setError(null);
      return data.runs;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load batch status");
      return null;
    }
  }, []);

  useEffect(() => {
    if (!batchId) {
      setRuns([]);
      setError(null);
      return;
    }

    let isActive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      setIsLoading(true);
      const result = await fetchBatchStatus(batchId);
      setIsLoading(false);
      if (!result || !isActive) return;

      const allDone = result.every((r) => TERMINAL_STATUSES.has(r.status));
      if (!allDone) {
        timer = setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      isActive = false;
      if (timer) clearTimeout(timer);
    };
  }, [batchId, fetchBatchStatus]);

  return { runs, isLoading, error, isAllDone };
}
