import { apiFetch } from "@/lib/api/internal/fetch";
import type { ChartDataResponse } from "@/types/chart";

export const chartsKeys = {
  all: (): string[] => ["charts"],
  chartData: (asset: string, timeframe: string, indicators: string): unknown[] => [
    "charts",
    "chart-data",
    asset,
    timeframe,
    indicators,
  ],
};

export const ChartsApiClient = {
  async getChartData(
    asset: string,
    timeframe: string,
    indicatorParam: string
  ): Promise<ChartDataResponse> {
    const params = new URLSearchParams({ asset, timeframe });
    if (indicatorParam) params.set("indicators", indicatorParam);
    return apiFetch<ChartDataResponse>(`/market/chart-data?${params.toString()}`);
  },
};
