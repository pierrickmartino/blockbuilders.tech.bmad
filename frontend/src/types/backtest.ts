export type BacktestStatus = "pending" | "running" | "completed" | "failed";

export interface BacktestCreateResponse {
  run_id: string;
  status: BacktestStatus;
}

export interface BacktestSummary {
  initial_balance: number;
  final_balance: number;
  total_return_pct: number;
  cagr_pct: number;
  max_drawdown_pct: number;
  num_trades: number;
  win_rate_pct: number;
}

export interface BacktestStatusResponse {
  run_id: string;
  strategy_id: string;
  status: BacktestStatus;
  asset: string;
  timeframe: string;
  date_from: string;
  date_to: string;
  triggered_by: string;
  summary?: BacktestSummary | null;
  error_message?: string | null;
}

export interface BacktestListItem {
  run_id: string;
  strategy_id: string;
  status: BacktestStatus;
  asset: string;
  timeframe: string;
  date_from: string;
  date_to: string;
  triggered_by: string;
  total_return?: number | null;
  created_at: string;
}

export interface Trade {
  entry_time: string;
  entry_price: number;
  exit_time: string;
  exit_price: number;
  side: string;
  pnl: number;
  pnl_pct: number;
}

export interface EquityCurvePoint {
  timestamp: string;
  equity: number;
}
