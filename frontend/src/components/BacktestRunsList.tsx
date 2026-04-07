"use client";

import { Button } from "@/components/ui/button";
import { formatDateTime, formatPercent, formatRelativeTime, type TimezoneMode } from "@/lib/format";
import { PERIOD_LABEL, statusStyles } from "@/lib/backtest-constants";
import type { BacktestListItem, BacktestStatus, BatchRunResult } from "@/types/backtest";

interface BacktestRunsListProps {
  backtests: BacktestListItem[];
  batchSkippedRuns: BatchRunResult[];
  isLoadingBacktests: boolean;
  onRefresh: () => void;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  selectedRunIds: Set<string>;
  onToggleRunSelection: (runId: string, checked: boolean) => void;
  onCompare: () => void;
  timezone: TimezoneMode;
}

function RunCard({
  run,
  isSelected,
  selectedRunIds,
  onSelectRun,
  onToggleRunSelection,
  timezone,
}: {
  run: BacktestListItem;
  isSelected: boolean;
  selectedRunIds: Set<string>;
  onSelectRun: (runId: string) => void;
  onToggleRunSelection: (runId: string, checked: boolean) => void;
  timezone: TimezoneMode;
}) {
  const isPositive = (run.total_return ?? 0) >= 0;
  const returnValue = run.total_return ?? 0;
  const canSelectForCompare = run.status === "completed";
  const isChecked = selectedRunIds.has(run.run_id);
  const disableForSelectionLimit = !isChecked && selectedRunIds.size >= 4;
  // Non-completed runs cannot be newly selected for compare, but keep checkbox enabled
  // when already checked so stale selections can be cleared.
  const isCheckboxDisabled = canSelectForCompare ? disableForSelectionLimit : !isChecked;

  const perfColor = run.status !== "completed"
    ? "bg-muted"
    : isPositive
      ? returnValue > 10 ? "bg-emerald-500" : "bg-emerald-400"
      : returnValue < -10 ? "bg-red-500" : "bg-red-400";

  return (
    <div className="flex items-stretch gap-2">
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => {
            if (!canSelectForCompare && e.target.checked) return;
            onToggleRunSelection(run.run_id, e.target.checked);
          }}
          disabled={isCheckboxDisabled}
          title={!canSelectForCompare ? "Only completed runs can be compared" : undefined}
          className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
        />
      </div>
      <button
        onClick={() => onSelectRun(run.run_id)}
        className={`group relative flex flex-1 overflow-hidden rounded-lg border transition-all ${
          isSelected
            ? "border-primary/40 bg-primary/10 shadow-sm ring-1 ring-primary/20"
            : "border-border bg-card hover:border-border hover:shadow-sm"
        }`}
      >
        <div className={`w-1 shrink-0 ${perfColor}`} />
        <div className="flex flex-1 flex-col px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {run.period_key && (
                <span className="flex h-4 items-center rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                  {PERIOD_LABEL[run.period_key] ?? run.period_key}
                </span>
              )}
              <span className="text-sm font-medium" title={formatDateTime(run.created_at, timezone)}>
                {formatRelativeTime(run.created_at)}
              </span>
              {run.triggered_by === "schedule" && (
                <span className="flex h-4 items-center rounded bg-purple-100 px-1.5 text-[10px] font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  auto
                </span>
              )}
              {run.batch_id && run.triggered_by !== "schedule" && (
                <span className="flex h-4 items-center rounded bg-indigo-100 px-1.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  batch
                </span>
              )}
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[run.status as BacktestStatus] ?? statusStyles.pending}`}>
              {run.status === "running" ? (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
                </span>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              )}
              {run.status}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {formatDateTime(run.date_from, timezone).split(" ")[0]} → {formatDateTime(run.date_to, timezone).split(" ")[0]}
            </span>
            <div className="flex items-center gap-3 text-xs tabular-nums">
              {run.status === "completed" && (
                <>
                  <span className={`text-sm font-semibold ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {isPositive ? "+" : ""}{formatPercent(run.total_return)}
                  </span>
                  {run.max_drawdown != null && (
                    <span className="hidden text-muted-foreground sm:inline">
                      DD {formatPercent(run.max_drawdown)}
                    </span>
                  )}
                  {run.sharpe_ratio != null && (
                    <span className="hidden text-muted-foreground md:inline">
                      Sharpe {run.sharpe_ratio.toFixed(2)}
                    </span>
                  )}
                </>
              )}
              {run.status === "failed" && (
                <span className="text-xs text-destructive">Error</span>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

function SkippedBatchRunCard({
  run,
}: {
  run: BatchRunResult;
}) {
  return (
    <div className="flex items-stretch gap-2">
      <div className="flex items-center">
        <span className="h-4 w-4" aria-hidden />
      </div>
      <div className="group relative flex flex-1 overflow-hidden rounded-lg border border-border bg-card">
        <div className="w-1 shrink-0 bg-muted" />
        <div className="flex flex-1 flex-col px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-4 items-center rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                {PERIOD_LABEL[run.period_key] ?? run.period_key}
              </span>
              <span className="flex h-4 items-center rounded bg-indigo-100 px-1.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                batch
              </span>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium capitalize ${statusStyles.skipped}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              skipped
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {run.skip_reason ?? "This period was skipped."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function BacktestRunsList({
  backtests,
  batchSkippedRuns,
  isLoadingBacktests,
  onRefresh,
  currentPage,
  pageSize,
  onPageChange,
  selectedRunId,
  onSelectRun,
  selectedRunIds,
  onToggleRunSelection,
  onCompare,
  timezone,
}: BacktestRunsListProps) {
  const flattenedRuns = [
    ...batchSkippedRuns.map((run, idx) => ({ type: "skipped" as const, key: `skipped-${run.period_key}-${idx}`, run })),
    ...backtests.map((run) => ({ type: "run" as const, key: run.run_id, run })),
  ];

  return (
    <section className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Runs</h2>
        <div className="flex items-center gap-2">
          {selectedRunIds.size >= 2 && selectedRunIds.size <= 4 && (
            <Button variant="default" size="sm" onClick={onCompare}>
              Compare ({selectedRunIds.size})
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoadingBacktests}
            className="h-8 px-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isLoadingBacktests ? "animate-spin" : ""}>
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Comparison selection info banners */}
      {selectedRunIds.size > 0 && selectedRunIds.size < 2 && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          Select 2-4 runs to compare
        </div>
      )}
      {selectedRunIds.size > 4 && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          Max 4 runs can be compared
        </div>
      )}

      {/* Runs list */}
      {flattenedRuns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 rounded-full bg-secondary p-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/70">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <p className="text-sm font-medium">No backtests yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Run your first backtest to see results here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {flattenedRuns.map((item) => {
            if (item.type === "skipped") {
              return <SkippedBatchRunCard key={item.key} run={item.run} />;
            }

            return (
              <RunCard
                key={item.key}
                run={item.run}
                isSelected={selectedRunId === item.run.run_id}
                selectedRunIds={selectedRunIds}
                onSelectRun={onSelectRun}
                onToggleRunSelection={onToggleRunSelection}
                timezone={timezone}
              />
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {backtests.length === pageSize && (
        <div className="mt-2 flex items-center justify-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-secondary/50 dark:bg-secondary/30 disabled:cursor-not-allowed disabled:opacity-30"
            title="Previous page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span className="px-2 text-xs text-muted-foreground">{currentPage}</span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={backtests.length < pageSize}
            className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-secondary/50 dark:bg-secondary/30 disabled:cursor-not-allowed disabled:opacity-30"
            title="Next page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
