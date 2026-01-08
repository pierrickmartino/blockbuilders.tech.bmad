/**
 * Backtest data export utilities for CSV and JSON formats.
 * Follows KISS principle: simple string concatenation, no dependencies.
 */

import type {
  TradeDetail,
  EquityCurvePoint,
  BacktestSummary,
  BacktestStatusResponse,
} from "@/types/backtest";

/**
 * Escape a value for CSV format.
 * Wraps in quotes if contains comma, newline, or quote.
 * Escapes internal quotes by doubling them.
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  // Check if escaping is needed
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    // Escape quotes by doubling them, then wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generic file download function.
 * Creates a blob, triggers download, then cleans up.
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export trades to CSV format.
 * Includes all 20 columns per PRD spec.
 */
export function exportTradesToCSV(trades: TradeDetail[], runId: string): void {
  const headers = [
    "entry_time",
    "entry_price",
    "exit_time",
    "exit_price",
    "side",
    "pnl",
    "pnl_pct",
    "qty",
    "sl_price_at_entry",
    "tp_price_at_entry",
    "exit_reason",
    "mae_usd",
    "mae_pct",
    "mfe_usd",
    "mfe_pct",
    "r_multiple",
    "peak_price",
    "peak_ts",
    "trough_price",
    "trough_ts",
    "duration_seconds",
  ];

  const csvHeader = headers.join(",");

  const csvRows = trades.map((trade) =>
    headers
      .map((header) => {
        const value = trade[header as keyof TradeDetail];
        return escapeCSVValue(value);
      })
      .join(",")
  );

  const csv = [csvHeader, ...csvRows].join("\n");
  const filename = `backtest-${runId}-trades.csv`;

  downloadFile(csv, filename, "text/csv");
}

/**
 * Export trades to JSON format.
 */
export function exportTradesToJSON(trades: TradeDetail[], runId: string): void {
  const json = JSON.stringify(trades, null, 2);
  const filename = `backtest-${runId}-trades.json`;

  downloadFile(json, filename, "application/json");
}

/**
 * Export equity curve to CSV format.
 */
export function exportEquityToCSV(
  curve: EquityCurvePoint[],
  runId: string
): void {
  const headers = ["timestamp", "equity"];
  const csvHeader = headers.join(",");

  const csvRows = curve.map((point) =>
    [point.timestamp, point.equity].map(escapeCSVValue).join(",")
  );

  const csv = [csvHeader, ...csvRows].join("\n");
  const filename = `backtest-${runId}-equity-curve.csv`;

  downloadFile(csv, filename, "text/csv");
}

/**
 * Export equity curve to JSON format.
 */
export function exportEquityToJSON(
  curve: EquityCurvePoint[],
  runId: string
): void {
  const json = JSON.stringify(curve, null, 2);
  const filename = `backtest-${runId}-equity-curve.json`;

  downloadFile(json, filename, "application/json");
}

/**
 * Export summary metrics to CSV format.
 * Single row with all metrics.
 */
export function exportMetricsToCSV(
  summary: BacktestSummary,
  run: BacktestStatusResponse,
  runId: string
): void {
  const headers = [
    "total_return_pct",
    "cagr_pct",
    "max_drawdown_pct",
    "num_trades",
    "win_rate_pct",
    "benchmark_return_pct",
    "alpha",
    "beta",
    "initial_balance",
    "final_balance",
    "date_from",
    "date_to",
  ];

  const values = [
    summary.total_return_pct,
    summary.cagr_pct,
    summary.max_drawdown_pct,
    summary.num_trades,
    summary.win_rate_pct,
    summary.benchmark_return_pct,
    summary.alpha,
    summary.beta,
    summary.initial_balance,
    summary.final_balance,
    run.date_from,
    run.date_to,
  ];

  const csvHeader = headers.join(",");
  const csvRow = values.map(escapeCSVValue).join(",");

  const csv = [csvHeader, csvRow].join("\n");
  const filename = `backtest-${runId}-metrics.csv`;

  downloadFile(csv, filename, "text/csv");
}

/**
 * Export summary metrics to JSON format.
 * Includes both summary and run metadata.
 */
export function exportMetricsToJSON(
  summary: BacktestSummary,
  run: BacktestStatusResponse,
  runId: string
): void {
  const data = {
    ...summary,
    asset: run.asset,
    timeframe: run.timeframe,
    date_from: run.date_from,
    date_to: run.date_to,
    run_id: runId,
  };

  const json = JSON.stringify(data, null, 2);
  const filename = `backtest-${runId}-metrics.json`;

  downloadFile(json, filename, "application/json");
}
