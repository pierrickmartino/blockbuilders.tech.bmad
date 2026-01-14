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
  benchmark_return_pct: number;
  alpha: number;
  beta: number;
}

export interface DataQualityMetrics {
  asset: string;
  timeframe: string;
  date_from: string;
  date_to: string;
  gap_percent: number;
  outlier_count: number;
  volume_consistency: number;
  has_issues: boolean;
  issues_description: string;
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
  data_quality?: DataQualityMetrics | null;
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

export interface TradeDetail {
  entry_time: string;
  entry_price: number;
  exit_time: string;
  exit_price: number;
  side: string;
  pnl: number;
  pnl_pct: number;
  qty: number;
  sl_price_at_entry: number | null;
  tp_price_at_entry: number | null;
  exit_reason: string;
  mae_usd: number;
  mae_pct: number;
  mfe_usd: number;
  mfe_pct: number;
  initial_risk_usd: number | null;
  r_multiple: number | null;
  peak_price: number;
  peak_ts: string;
  trough_price: number;
  trough_ts: string;
  duration_seconds: number;
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TradeDetailResponse {
  trade: TradeDetail;
  candles: Candle[];
  asset: string;
  timeframe: string;
}

export interface GapRange {
  start: string;
  end: string;
}

export interface DataCompletenessResponse {
  asset: string;
  timeframe: string;
  coverage_start: string | null;
  coverage_end: string | null;
  completeness_percent: number;
  gap_count: number;
  gap_total_hours: number;
  gap_ranges: GapRange[];
}
