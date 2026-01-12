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
  backtest_credit_balance: number;
  extra_strategy_slots: number;
}

export interface UsageBundle {
  strategies: UsageItem;
  backtests_today: BacktestUsageItem;
}

export interface PlanResponse {
  tier: "free" | "pro" | "premium";
  interval: "monthly" | "annual" | null;
  status: "active" | "past_due" | "canceled" | "trialing" | null;
  max_strategies: number;
  max_backtests_per_day: number;
  max_history_days: number;
}

export interface ProfileResponse {
  id: string;
  email: string;
  settings: SettingsResponse;
  usage: UsageBundle;
  plan: PlanResponse;
}
