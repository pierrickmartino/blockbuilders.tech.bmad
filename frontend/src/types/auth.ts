export interface User {
  id: string;
  email: string;
  default_fee_percent: number | null;
  default_slippage_percent: number | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UserUpdateRequest {
  default_fee_percent?: number | null;
  default_slippage_percent?: number | null;
}

export interface Usage {
  strategies_count: number;
  strategies_limit: number;
  backtests_today_count: number;
  backtests_daily_limit: number;
  backtests_reset_at: string;
}
