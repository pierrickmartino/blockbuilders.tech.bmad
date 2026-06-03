import { useQuery } from "@tanstack/react-query";
import { BacktestsApiClient, backtestsKeys } from "@/lib/api/backtests-client";
import type {
  BacktestStatusResponse,
  EquityCurvePoint,
  TradeDetail,
} from "@/types/backtest";

const TERMINAL_STATUSES = new Set(["completed", "failed", "skipped"]);
const ACTIVE_STATUSES = new Set(["pending", "running"]);

interface UseBacktestResultsReturn {
  selectedRun: BacktestStatusResponse | null;
  trades: TradeDetail[];
  equityCurve: EquityCurvePoint[];
  benchmarkCurve: EquityCurvePoint[];
  isLoadingTrades: boolean;
  isLoadingEquityCurve: boolean;
  tradesError: string | null;
  equityCurveError: string | null;
  refetch: () => void;
}

export function useBacktestResults(
  selectedRunId: string | null,
  onRunDetailFetched?: (detail: BacktestStatusResponse) => void
): UseBacktestResultsReturn {
  const runQuery = useQuery({
    queryKey: backtestsKeys.detail(selectedRunId ?? ""),
    queryFn: async () => {
      const detail = await BacktestsApiClient.get(selectedRunId!);
      onRunDetailFetched?.(detail);
      return detail;
    },
    enabled: !!selectedRunId,
    refetchInterval: (query) =>
      ACTIVE_STATUSES.has(query.state.data?.status ?? "") ? 5000 : false,
    throwOnError: false,
  });

  const status = runQuery.data?.status;
  const isCompleted = status === "completed";

  const tradesQuery = useQuery({
    queryKey: backtestsKeys.trades(selectedRunId ?? ""),
    queryFn: () => BacktestsApiClient.getTrades(selectedRunId!),
    enabled: !!selectedRunId && isCompleted,
    throwOnError: false,
  });

  const equityCurveQuery = useQuery({
    queryKey: backtestsKeys.equityCurve(selectedRunId ?? ""),
    queryFn: () => BacktestsApiClient.getEquityCurve(selectedRunId!),
    enabled: !!selectedRunId && isCompleted,
    throwOnError: false,
  });

  const benchmarkQuery = useQuery({
    queryKey: backtestsKeys.benchmarkCurve(selectedRunId ?? ""),
    queryFn: () => BacktestsApiClient.getBenchmarkEquityCurve(selectedRunId!),
    enabled: !!selectedRunId && isCompleted,
    throwOnError: false,
    retry: false,
  });

  return {
    selectedRun: runQuery.data ?? null,
    trades: isCompleted ? (tradesQuery.data ?? []) : [],
    equityCurve: isCompleted ? (equityCurveQuery.data ?? []) : [],
    benchmarkCurve: isCompleted && !benchmarkQuery.error ? (benchmarkQuery.data ?? []) : [],
    isLoadingTrades: tradesQuery.isFetching,
    isLoadingEquityCurve: equityCurveQuery.isFetching,
    tradesError: tradesQuery.error
      ? tradesQuery.error instanceof Error
        ? tradesQuery.error.message
        : "Failed to load trades"
      : null,
    equityCurveError: equityCurveQuery.error
      ? equityCurveQuery.error instanceof Error
        ? equityCurveQuery.error.message
        : "Failed to load equity curve"
      : null,
    refetch: () => {
      runQuery.refetch();
    },
  };
}
