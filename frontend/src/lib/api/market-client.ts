import { apiFetch } from "@/lib/api";
import type { TickerListResponse, MarketSentimentResponse } from "@/types/market";

export const marketKeys = {
  all: (): string[] => ["market"],
  tickers: (): string[] => ["market", "tickers"],
  sentiment: (asset: string): unknown[] => ["market", "sentiment", asset],
  dataAvailability: (asset: string, timeframe: string): unknown[] => [
    "market",
    "data-availability",
    asset,
    timeframe,
  ],
};

export const MarketApiClient = {
  async getTickers(): Promise<TickerListResponse> {
    return apiFetch<TickerListResponse>("/market/tickers");
  },

  async getSentiment(asset: string): Promise<MarketSentimentResponse> {
    return apiFetch<MarketSentimentResponse>(
      `/market/sentiment?asset=${encodeURIComponent(asset)}`
    );
  },

  async getDataAvailability(asset: string, timeframe: string): Promise<unknown> {
    return apiFetch(
      `/market/data-availability?asset=${encodeURIComponent(asset)}&timeframe=${timeframe}`
    );
  },
};
