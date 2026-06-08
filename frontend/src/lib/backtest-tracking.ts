import { trackEvent } from "@/lib/analytics";
import { resolveCohort } from "@/lib/cohort-resolver";
import type { StrategyEntryPath } from "@/types/strategy";

interface TrackBacktestStartedParams {
  strategyId: string;
  /** The loaded strategy's persisted `entry_path` (or `null`) — never a guess. */
  entryPath: StrategyEntryPath | null;
  runId: string;
  dateFrom: string;
  dateTo: string;
  userId?: string;
}

/**
 * Fires `backtest_started` carrying the resolved `{ entry_path, authoring_mode }`
 * cohort pair (ADR-0009) alongside the run's identifying details. Extracted
 * from the backtest page so the cohort-aware payload is unit testable without
 * rendering that 1600+ line component — mirroring `useResultViewedTracking`.
 */
export function trackBacktestStarted({
  strategyId,
  entryPath,
  runId,
  dateFrom,
  dateTo,
  userId,
}: TrackBacktestStartedParams): void {
  const cohort = resolveCohort(entryPath);
  trackEvent(
    "backtest_started",
    {
      strategy_id: strategyId,
      run_id: runId,
      date_from: dateFrom,
      date_to: dateTo,
      entry_path: cohort.entry_path,
      authoring_mode: cohort.authoring_mode,
    },
    userId
  );
}
