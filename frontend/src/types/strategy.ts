export interface Strategy {
  id: string;
  name: string;
  asset: string;
  timeframe: string;
  is_archived: boolean;
  auto_update_enabled: boolean;
  created_at: string;
  updated_at: string;
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
}

export interface StrategyVersionCreateRequest {
  definition: Record<string, unknown>;
}

// MVP allowed values
export const ALLOWED_ASSETS = ["BTC/USDT", "ETH/USDT"] as const;
export const ALLOWED_TIMEFRAMES = ["1d", "4h"] as const;

export type AllowedAsset = (typeof ALLOWED_ASSETS)[number];
export type AllowedTimeframe = (typeof ALLOWED_TIMEFRAMES)[number];
