import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BacktestPageHeader } from "@/components/backtest/PageHeader";
import type { Strategy } from "@/types/strategy";
import type { BacktestStatusResponse, BacktestSummary } from "@/types/backtest";

const STRATEGY: Strategy = {
  id: "strategy-1",
  name: "My Strategy",
  asset: "BTC/USDT",
  timeframe: "1d",
  entry_path: "nl_wedge",
  is_archived: false,
  auto_update_enabled: false,
  auto_update_lookback_days: 90,
  last_auto_run_at: null,
  digest_email_enabled: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  tags: [],
};

const SUMMARY: BacktestSummary = {
  initial_balance: 10000,
  final_balance: 11000,
  total_return_pct: 10,
  cagr_pct: 10,
  max_drawdown_pct: -5,
  num_trades: 12,
  win_rate_pct: 60,
  benchmark_return_pct: 5,
  alpha: 1,
  beta: 1,
  sharpe_ratio: 1,
  sortino_ratio: 1,
  calmar_ratio: 1,
  max_consecutive_losses: 2,
};

const COMPLETED_RUN: BacktestStatusResponse = {
  run_id: "run-1",
  strategy_id: "strategy-1",
  strategy_version_id: "ver-1",
  strategy_version_number: 1,
  status: "completed",
  asset: "BTC/USDT",
  timeframe: "1d",
  date_from: "2025-01-01T00:00:00Z",
  date_to: "2026-01-01T00:00:00Z",
  triggered_by: "nl_wedge",
  summary: SUMMARY,
};

const baseProps = {
  strategy: STRATEGY,
  strategyVersion: null,
  selectedRun: COMPLETED_RUN,
  selectedRunId: "run-1",
  dataQuality: null,
  displayedDateFrom: "2025-01-01",
  displayedDateTo: "2026-01-01",
  timezone: "utc" as const,
  isZeroTradeNarrativeMode: false,
  onShare: vi.fn(),
  onRunBacktest: vi.fn(),
  isSubmitting: false,
  selectedPeriodCount: 1,
};

describe("BacktestPageHeader", () => {
  it("shows the Share and Export actions for a completed run", () => {
    render(<BacktestPageHeader {...baseProps} />);

    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
  });

  it("hides the Share action but keeps Export when shareLocked is true", () => {
    render(<BacktestPageHeader {...baseProps} shareLocked />);

    expect(screen.queryByRole("button", { name: /share/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
  });
});
