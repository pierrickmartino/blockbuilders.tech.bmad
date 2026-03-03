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
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
  max_consecutive_losses: number;
  gross_return_usd?: number | null;
  gross_return_pct?: number | null;
  total_fees_usd?: number | null;
  total_slippage_usd?: number | null;
  total_spread_usd?: number | null;
  total_costs_usd?: number | null;
  cost_pct_gross_return?: number | null;
  avg_cost_per_trade_usd?: number | null;
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
  fee_cost_usd?: number | null;
  slippage_cost_usd?: number | null;
  spread_cost_usd?: number | null;
  total_cost_usd?: number | null;
  notional_usd?: number | null;
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface IndicatorSeries {
  indicator_type: string;
  label: string;
  series_data: (number | null)[];
  plot_type: string;
  subplot: boolean;
  color?: string | null;
  port?: string | null;
}

export interface EntryExplanation {
  summary: string;
  conditions: string[];
}

export interface ExitExplanation {
  summary: string;
  reason_type: string;
  details?: Record<string, unknown> | null;
}

export interface TradeDetailResponse {
  trade: TradeDetail;
  candles: Candle[];
  asset: string;
  timeframe: string;
  entry_explanation?: EntryExplanation | null;
  exit_explanation?: ExitExplanation | null;
  indicator_series?: IndicatorSeries[] | null;
  explanation_partial?: boolean;
}

export interface GapRange {
  start: string;
  end: string;
}

export interface DataAvailabilityResponse {
  asset: string;
  timeframe: string;
  earliest_date: string | null;
  latest_date: string | null;
  source: string;
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

export interface ShareLinkCreateRequest {
  expires_at: string | null;
}

export interface ShareLinkCreateResponse {
  url: string;
  token: string;
  expires_at: string | null;
}

export interface PublicBacktestView {
  asset: string;
  timeframe: string;
  date_from: string;
  date_to: string;
  summary: BacktestSummary;
  equity_curve: EquityCurvePoint[];
}

export interface BacktestCompareRequest {
  run_ids: string[];
}

export interface BacktestCompareRun {
  run_id: string;
  asset: string;
  timeframe: string;
  date_from: string;
  date_to: string;
  created_at: string;
  summary: BacktestSummary | null;
  equity_curve: EquityCurvePoint[];
}

export interface BacktestCompareResponse {
  runs: BacktestCompareRun[];
}
