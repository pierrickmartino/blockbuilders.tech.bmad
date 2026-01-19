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
