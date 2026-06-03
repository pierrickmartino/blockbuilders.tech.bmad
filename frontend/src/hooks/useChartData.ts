import { useQuery } from "@tanstack/react-query";
import { ChartsApiClient, chartsKeys } from "@/lib/api/charts-client";
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
  const indicatorParam = serializeIndicators(indicators);

  const query = useQuery({
    queryKey: chartsKeys.chartData(asset ?? "", timeframe, indicatorParam),
    queryFn: () => ChartsApiClient.getChartData(asset!, timeframe, indicatorParam),
    enabled: asset !== null,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : "Failed to fetch chart data"
      : null,
    refresh: () => { query.refetch(); },
  };
}
