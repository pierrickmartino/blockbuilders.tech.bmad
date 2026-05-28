import { useQuery } from "@tanstack/react-query";
import { BacktestsApiClient, backtestsKeys } from "@/lib/api/backtests-client";
import type { BacktestStatusResponse } from "@/types/backtest";

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
  const query = useQuery({
    queryKey: backtestsKeys.batch(batchId ?? ""),
    queryFn: () => BacktestsApiClient.getBatchStatus(batchId!),
    enabled: !!batchId,
    refetchInterval: (q) => {
      const runs = q.state.data?.runs ?? [];
      const allDone = runs.length > 0 && runs.every((r) => TERMINAL_STATUSES.has(r.status));
      return allDone ? false : 5000;
    },
    throwOnError: false,
  });

  const runs = query.data?.runs ?? [];
  const isAllDone = runs.length > 0 && runs.every((r) => TERMINAL_STATUSES.has(r.status));

  return {
    runs,
    isLoading: query.isFetching,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : "Failed to load batch status"
      : null,
    isAllDone,
  };
}
