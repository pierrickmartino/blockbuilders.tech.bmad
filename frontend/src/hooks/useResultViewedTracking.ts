import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import type { BacktestStatus } from "@/types/backtest";

export type ResultsViewedEntryPath = "manual" | "wizard" | "nl_wedge";

interface UseResultViewedTrackingOptions {
  runId: string | null | undefined;
  status: BacktestStatus | null | undefined;
  strategyId: string;
  entryPath: ResultsViewedEntryPath;
  userId?: string;
}

const trackedRunIds = new Set<string>();

/**
 * Canonical activation tracker (ADR-0008): emits `results_viewed` exactly
 * once per `runId`, the moment a completed run's results render. Dedup is
 * keyed on `runId` alone (not entry path or user) so re-renders, remounts,
 * and cross-entry-path navigation to the same run never double-count.
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
    trackEvent(
      "results_viewed",
      { strategy_id: strategyId, run_id: runId, entry_path: entryPath },
      userId
    );
  }, [runId, status, strategyId, entryPath, userId]);
}
