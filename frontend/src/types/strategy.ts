export interface Strategy {
  id: string;
  name: string;
  asset: string;
  timeframe: string;
  is_archived: boolean;
  auto_update_enabled: boolean;
  auto_update_lookback_days: number;
  last_auto_run_at: string | null;
  created_at: string;
  updated_at: string;
  latest_total_return_pct?: number | null;
  latest_max_drawdown_pct?: number | null;
  latest_win_rate_pct?: number | null;
  latest_num_trades?: number | null;
  last_run_at?: string | null;
}

export interface StrategyVersion {
  id: string;
  version_number: number;
  created_at: string;
}

export interface StrategyVersionDetail extends StrategyVersion {
  definition_json: Record<string, unknown>;
}

export interface StrategyCreateRequest {
  name: string;
  asset: string;
  timeframe: string;
}

export interface StrategyUpdateRequest {
  name?: string;
  asset?: string;
  timeframe?: string;
  is_archived?: boolean;
  auto_update_enabled?: boolean;
  auto_update_lookback_days?: number;
}

export interface StrategyVersionCreateRequest {
  definition: Record<string, unknown>;
}

// MVP allowed values
export const ALLOWED_ASSETS = [
  // Major pairs (existing)
  "BTC/USDT",
  "ETH/USDT",
  // Large cap altcoins
  "ADA/USDT",
  "SOL/USDT",
  "MATIC/USDT",
  "LINK/USDT",
  "DOT/USDT",
  "XRP/USDT",
  "DOGE/USDT",
  "AVAX/USDT",
  "LTC/USDT",
  "BCH/USDT",
  "ATOM/USDT",
  "NEAR/USDT",
  "FIL/USDT",
  // Mid-cap altcoins
  "APT/USDT",
  "OP/USDT",
  "ARB/USDT",
  "INJ/USDT",
  "UNI/USDT",
  "AAVE/USDT",
  // Newer entrants
  "SUI/USDT",
  "SEI/USDT",
  "TIA/USDT",
] as const;
export const ALLOWED_TIMEFRAMES = ["1d", "4h"] as const;

export type AllowedAsset = (typeof ALLOWED_ASSETS)[number];
export type AllowedTimeframe = (typeof ALLOWED_TIMEFRAMES)[number];
