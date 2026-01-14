export interface TickerItem {
  pair: string;
  price: number;
  change_24h_pct: number;
  volume_24h: number;
}

export interface TickerListResponse {
  items: TickerItem[];
  as_of: string;
}
