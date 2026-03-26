export interface StrategyTag {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Strategy {
  id: string;
  name: string;
  asset: string;
  timeframe: string;
  is_archived: boolean;
  auto_update_enabled: boolean;
  auto_update_lookback_days: number;
  last_auto_run_at: string | null;
  digest_email_enabled: boolean;
  created_at: string;
  updated_at: string;
  tags?: StrategyTag[];
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
  tag_ids?: string[];
  digest_email_enabled?: boolean;
}

export interface StrategyVersionCreateRequest {
  definition: Record<string, unknown>;
}

// Supported trading pairs (~50 tokens)
export const ALLOWED_ASSETS = [
  // Major pairs
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
  "BNB/USDT",
  "TRX/USDT",
  "TON/USDT",
  "HBAR/USDT",
  "VET/USDT",
  "ALGO/USDT",
  "XLM/USDT",
  "EOS/USDT",
  "ICP/USDT",
  "SHIB/USDT",
  "PEPE/USDT",
  // Mid-cap altcoins
  "APT/USDT",
  "OP/USDT",
  "ARB/USDT",
  "INJ/USDT",
  "UNI/USDT",
  "AAVE/USDT",
  "SUI/USDT",
  "SEI/USDT",
  "TIA/USDT",
  "FTM/USDT",
  "CRV/USDT",
  "GRT/USDT",
  "MKR/USDT",
  "SNX/USDT",
  "RENDER/USDT",
  "FET/USDT",
  "STX/USDT",
  "IMX/USDT",
  "PENDLE/USDT",
  "THETA/USDT",
  "TAO/USDT",
  "WLD/USDT",
  "JUP/USDT",
  "SAND/USDT",
  "MANA/USDT",
] as const;
export const ALLOWED_TIMEFRAMES = ["1d", "4h"] as const;

export type AllowedAsset = (typeof ALLOWED_ASSETS)[number];
export type AllowedTimeframe = (typeof ALLOWED_TIMEFRAMES)[number];

export interface StrategyExportFile {
  schema_version: 1;
  exported_at: string; // ISO timestamp
  strategy: {
    name: string;
    asset: string;
    timeframe: string;
  };
  definition_json: Record<string, unknown>;
}
