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
  mentions: "ok" | "partial" | "unavailable";
  funding: "ok" | "partial" | "unavailable";
}

export interface MarketSentimentResponse {
  as_of: string;
  asset: string;
  fear_greed: SentimentIndicator;
  mentions: SentimentIndicator;
  funding: SentimentIndicator;
  source_status: SourceStatus;
}

export interface BacktestSentimentResponse {
  as_of: string;
  asset: string;
  date_from: string;
  date_to: string;
  fear_greed_start: number | null;
  fear_greed_end: number | null;
  fear_greed_avg: number | null;
  mentions_avg: number | null;
  funding_avg: number | null;
  fear_greed_history: HistoryPoint[];
  mentions_history: HistoryPoint[];
  funding_history: HistoryPoint[];
  source_status: SourceStatus;
}
