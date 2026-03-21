export interface TickerItem {
  pair: string;
  price: number;
  change_24h_pct: number;
  volume_24h: number;
  volatility_stddev?: number | null;
  volatility_atr_pct?: number | null;
  volatility_percentile_1y?: number | null;
}

export interface TickerListResponse {
  items: TickerItem[];
  as_of: string;
}

export interface HistoryPoint {
  t: string;  // YYYY-MM-DD
  v: number;
}

export interface SentimentIndicator {
  value: number | null;
  history: HistoryPoint[];
}

export interface SourceStatus {
  fear_greed: "ok" | "partial" | "unavailable";
  long_short_ratio: "ok" | "partial" | "unavailable";
  funding: "ok" | "partial" | "unavailable";
}

export interface MarketSentimentResponse {
  as_of: string;
  asset: string;
  fear_greed: SentimentIndicator;
  long_short_ratio: SentimentIndicator;
  funding: SentimentIndicator;
  source_status: SourceStatus;
}

