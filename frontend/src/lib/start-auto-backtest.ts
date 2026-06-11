import { BacktestsApiClient } from "@/lib/api/backtests-client";
import { trackEvent } from "@/lib/analytics";
import { resolveCohort } from "@/lib/cohort-resolver";
import type { StrategyEntryPath } from "@/types/strategy";

/** The auto-backtest window, shared by the wizard and the NL wedge for
 * `wizard`/`nl_wedge` cohort comparability (ADR-0013). */
const AUTO_BACKTEST_WINDOW_YEARS = 1;

export interface StartAutoBacktestParams {
  strategyId: string;
  /** The persisted `entry_path` that triggered this auto-backtest, used both
   * as the `auto_backtest_started` `source` and to resolve the cohort. */
  entryPath: StrategyEntryPath | null;
  userId?: string;
}

export interface StartAutoBacktestResult {
  runId: string;
}

/**
 * Enqueue the 1-year (`yearAgo → now`) auto-backtest for a strategy and fire
 * `auto_backtest_started` (ADR-0013). The asset/timeframe come from the
 * strategy itself via `strategy_id` — never a second source. The single home
 * of the window invariant and the start-telemetry shared across entry paths.
 */
export async function startAutoBacktest({
  strategyId,
  entryPath,
  userId,
}: StartAutoBacktestParams): Promise<StartAutoBacktestResult> {
  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - AUTO_BACKTEST_WINDOW_YEARS);

  const { run_id: runId } = await BacktestsApiClient.create({
    strategy_id: strategyId,
    date_from: yearAgo.toISOString(),
    date_to: now.toISOString(),
  });

  trackEvent(
    "auto_backtest_started",
    {
      strategy_id: strategyId,
      run_id: runId,
      source: entryPath,
      ...resolveCohort(entryPath),
    },
    userId
  );

  return { runId };
}
