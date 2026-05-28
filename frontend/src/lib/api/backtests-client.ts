import { apiFetch } from "@/lib/api";
import type {
  BacktestCreateResponse,
  BacktestListPage,
  BacktestStatusResponse,
  BatchBacktestCreateResponse,
  BatchStatusResponse,
  BacktestCompareResponse,
  DataQualityMetrics,
  DataCompletenessResponse,
  ShareLinkCreateRequest,
  ShareLinkCreateResponse,
  TradeDetail,
  TradeDetailResponse,
  EquityCurvePoint,
} from "@/types/backtest";

export interface BacktestCreateRequest {
  strategy_id: string;
  date_from: string;
  date_to: string;
  fee_rate?: number;
  slippage_rate?: number;
  force_refresh_prices?: boolean;
}

export interface BatchCreateRequest {
  strategy_id: string;
  periods: string[];
  fee_rate?: number;
  slippage_rate?: number;
}

export interface BacktestListFilters {
  strategy_id?: string;
  limit?: number;
  offset?: number;
}

export const backtestsKeys = {
  all: (): string[] => ["backtests"],
  lists: (): string[] => ["backtests", "list"],
  list: (filters: Record<string, unknown>): unknown[] => ["backtests", "list", filters],
  detail: (runId: string): unknown[] => ["backtests", "detail", runId],
  trades: (runId: string): unknown[] => ["backtests", runId, "trades"],
  tradeDetail: (runId: string, tradeIdx: number): unknown[] => ["backtests", runId, "trade", tradeIdx],
  equityCurve: (runId: string): unknown[] => ["backtests", runId, "equity-curve"],
  benchmarkCurve: (runId: string): unknown[] => ["backtests", runId, "benchmark-curve"],
  batch: (batchId: string): unknown[] => ["backtests", "batch", batchId],
  compare: (runIds: string[]): unknown[] => ["backtests", "compare", [...runIds].sort()],
  dataQuality: (asset: string, timeframe: string, dateFrom: string, dateTo: string): unknown[] => [
    "backtests", "data-quality", asset, timeframe, dateFrom, dateTo,
  ],
  dataCompleteness: (asset: string, timeframe: string): unknown[] => [
    "backtests", "data-completeness", asset, timeframe,
  ],
};

export const BacktestsApiClient = {
  async list(filters: BacktestListFilters): Promise<BacktestListPage> {
    const params = new URLSearchParams();
    if (filters.strategy_id) params.set("strategy_id", filters.strategy_id);
    if (filters.limit !== undefined) params.set("limit", String(filters.limit));
    if (filters.offset !== undefined && filters.offset > 0) params.set("offset", String(filters.offset));
    const qs = params.toString();
    return apiFetch<BacktestListPage>(qs ? `/backtests/?${qs}` : "/backtests/");
  },

  async get(runId: string): Promise<BacktestStatusResponse> {
    return apiFetch<BacktestStatusResponse>(`/backtests/${runId}`);
  },

  async create(data: BacktestCreateRequest): Promise<BacktestCreateResponse> {
    return apiFetch<BacktestCreateResponse>("/backtests/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getTrades(runId: string): Promise<TradeDetail[]> {
    return apiFetch<TradeDetail[]>(`/backtests/${runId}/trades`);
  },

  async getTradeDetail(runId: string, tradeIdx: number): Promise<TradeDetailResponse> {
    return apiFetch<TradeDetailResponse>(`/backtests/${runId}/trades/${tradeIdx}`);
  },

  async getEquityCurve(runId: string): Promise<EquityCurvePoint[]> {
    return apiFetch<EquityCurvePoint[]>(`/backtests/${runId}/equity-curve`);
  },

  async getBenchmarkEquityCurve(runId: string): Promise<EquityCurvePoint[]> {
    return apiFetch<EquityCurvePoint[]>(`/backtests/${runId}/benchmark-equity-curve`);
  },

  async getDataQuality(
    asset: string,
    timeframe: string,
    dateFrom: string,
    dateTo: string
  ): Promise<DataQualityMetrics> {
    const url =
      `/backtests/data-quality?asset=${encodeURIComponent(asset)}&timeframe=${timeframe}` +
      `&date_from=${dateFrom}T00:00:00Z&date_to=${dateTo}T23:59:59Z`;
    return apiFetch<DataQualityMetrics>(url);
  },

  async getDataCompleteness(asset: string, timeframe: string): Promise<DataCompletenessResponse> {
    return apiFetch<DataCompletenessResponse>(
      `/backtests/data-completeness?asset=${encodeURIComponent(asset)}&timeframe=${timeframe}`
    );
  },

  async createBatch(data: BatchCreateRequest): Promise<BatchBacktestCreateResponse> {
    return apiFetch<BatchBacktestCreateResponse>("/backtests/batch", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getBatchStatus(batchId: string): Promise<BatchStatusResponse> {
    return apiFetch<BatchStatusResponse>(`/backtests/batch/${batchId}`);
  },

  async compare(runIds: string[]): Promise<BacktestCompareResponse> {
    return apiFetch<BacktestCompareResponse>("/backtests/compare", {
      method: "POST",
      body: JSON.stringify({ run_ids: runIds }),
    });
  },

  async createShareLink(runId: string, data: ShareLinkCreateRequest): Promise<ShareLinkCreateResponse> {
    return apiFetch<ShareLinkCreateResponse>(`/backtests/${runId}/share-links`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
