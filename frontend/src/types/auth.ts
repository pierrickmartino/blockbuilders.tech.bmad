export interface User {
  id: string;
  email: string;
  default_fee_percent: number | null;
  default_slippage_percent: number | null;
  timezone_preference: "local" | "utc";
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UserUpdateRequest {
  default_fee_percent?: number | null;
  default_slippage_percent?: number | null;
  timezone_preference?: "local" | "utc";
}

// Legacy Usage type (kept for /usage/me endpoint compatibility)
export interface Usage {
  strategies_count: number;
  strategies_limit: number;
  backtests_today_count: number;
  backtests_daily_limit: number;
  backtests_reset_at: string;
}

// Profile page bundled response types
export interface UsageItem {
  used: number;
  limit: number;
}

export interface BacktestUsageItem extends UsageItem {
  resets_at_utc: string;
}

export interface SettingsResponse {
  default_fee_percent: number | null;
  default_slippage_percent: number | null;
  timezone_preference: "local" | "utc";
}

export interface UsageBundle {
  strategies: UsageItem;
  backtests_today: BacktestUsageItem;
}

export interface ProfileResponse {
  id: string;
  email: string;
  settings: SettingsResponse;
  usage: UsageBundle;
}
