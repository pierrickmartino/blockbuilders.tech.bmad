import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { resolveCohort } from "@/lib/cohort-resolver";
import type { BacktestStatus } from "@/types/backtest";
import type { StrategyEntryPath } from "@/types/strategy";

interface UseResultViewedTrackingOptions {
  runId: string | null | undefined;
  status: BacktestStatus | null | undefined;
  strategyId: string;
  /** The loaded strategy's persisted `entry_path` (or `null`) — never a guess. */
  entryPath: StrategyEntryPath | null;
  userId?: string;
}

const trackedRunIds = new Set<string>();

/**
 * Canonical activation tracker (ADR-0008): emits `results_viewed` exactly
 * once per `runId`, the moment a completed run's results render. The
 * persisted `entry_path` is run through the cohort resolver (ADR-0009) — the
 * sole authority turning it into the `{ entry_path, authoring_mode }` pair
 * every event carries, so a `null` persisted value surfaces honestly as the
 * `unknown` cohort rather than a guessed literal. Dedup is keyed on `runId`
 * alone (not entry path or user) so re-renders, remounts, and
 * cross-entry-path navigation to the same run never double-count.
 */
export function useResultViewedTracking({
  runId,
  status,
  strategyId,
  entryPath,
  userId,
}: UseResultViewedTrackingOptions): void {
  useEffect(() => {
    if (status !== "completed" || !runId) return;
    if (trackedRunIds.has(runId)) return;

    trackedRunIds.add(runId);
    const cohort = resolveCohort(entryPath);
    trackEvent(
      "results_viewed",
      {
        strategy_id: strategyId,
        run_id: runId,
        entry_path: cohort.entry_path,
        authoring_mode: cohort.authoring_mode,
      },
      userId
    );
  }, [runId, status, strategyId, entryPath, userId]);
}
