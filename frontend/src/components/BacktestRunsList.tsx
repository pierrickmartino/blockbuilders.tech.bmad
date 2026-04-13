"use client";

import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Info,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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
  className?: string;
}

const MAX_COMPARE = 4;

function scrollToRunForm() {
  if (typeof document === "undefined") return;
  const el = document.getElementById("run-backtest-form");
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const atLimit = !isChecked && selectedRunIds.size >= MAX_COMPARE;
  const isCheckboxDisabled = canSelectForCompare ? atLimit : !isChecked;

  const disabledReason = !canSelectForCompare
    ? "Only completed runs can be compared"
    : atLimit
      ? `Maximum ${MAX_COMPARE} runs can be compared`
      : null;

  const perfColor =
    run.status !== "completed"
      ? "bg-muted"
      : isPositive
        ? returnValue > 10
          ? "bg-success"
          : "bg-success/70"
        : returnValue < -10
          ? "bg-destructive"
          : "bg-destructive/70";

  const absoluteDate = formatDateTime(run.created_at, timezone);
  const rowLabel = `Run from ${absoluteDate}${
    run.status === "completed" ? `, return ${formatPercent(run.total_return)}` : `, status ${run.status}`
  }`;

  const checkbox = (
    <label
      className="flex h-full items-center"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="sr-only">Select {rowLabel} for comparison</span>
      <input
        type="checkbox"
        checked={isChecked}
        onChange={(e) => {
          if (!canSelectForCompare && e.target.checked) return;
          onToggleRunSelection(run.run_id, e.target.checked);
        }}
        disabled={isCheckboxDisabled}
        aria-describedby={disabledReason ? `${run.run_id}-disabled-reason` : undefined}
        className="h-4 w-4 rounded border-border text-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {disabledReason && (
        <span id={`${run.run_id}-disabled-reason`} className="sr-only">
          {disabledReason}
        </span>
      )}
    </label>
  );

  return (
    <div className="flex items-stretch gap-2">
      {disabledReason ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{checkbox}</div>
          </TooltipTrigger>
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        checkbox
      )}
      <button
        type="button"
        onClick={() => onSelectRun(run.run_id)}
        aria-pressed={isSelected}
        aria-label={rowLabel}
        className={`group relative flex flex-1 overflow-hidden rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
          isSelected
            ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
            : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
        }`}
      >
        <div className={`w-1 shrink-0 ${perfColor}`} aria-hidden />
        <div className="flex flex-1 flex-col px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {run.period_key && (
                <span className="data-text flex h-4 items-center rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                  {PERIOD_LABEL[run.period_key] ?? run.period_key}
                </span>
              )}
              <time
                dateTime={run.created_at}
                className="data-text text-sm font-medium"
              >
                {formatRelativeTime(run.created_at)}
              </time>
              {run.triggered_by === "schedule" && (
                <span className="flex h-4 items-center rounded bg-info/15 px-1.5 text-[10px] font-medium text-info">
                  auto
                </span>
              )}
              {run.batch_id && run.triggered_by !== "schedule" && (
                <span className="flex h-4 items-center rounded bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
                  batch
                </span>
              )}
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium capitalize ${
                statusStyles[run.status as BacktestStatus] ?? statusStyles.pending
              }`}
            >
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
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="data-text text-xs text-muted-foreground">
              {formatDateTime(run.date_from, timezone).split(" ")[0]} →{" "}
              {formatDateTime(run.date_to, timezone).split(" ")[0]}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-0.5 text-xs tabular-nums">
              {run.status === "completed" && (
                <>
                  <span
                    className={`inline-flex items-center gap-0.5 text-sm font-semibold ${
                      isPositive ? "text-success" : "text-destructive"
                    }`}
                    aria-label={`${isPositive ? "Gain" : "Loss"} ${formatPercent(run.total_return)}`}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" aria-hidden />
                    ) : (
                      <TrendingDown className="h-3 w-3" aria-hidden />
                    )}
                    {isPositive ? "+" : ""}
                    {formatPercent(run.total_return)}
                  </span>
                  {run.max_drawdown != null && (
                    <span className="text-muted-foreground">
                      DD {formatPercent(run.max_drawdown)}
                    </span>
                  )}
                  {run.sharpe_ratio != null && (
                    <span className="text-muted-foreground">
                      Sharpe {run.sharpe_ratio.toFixed(2)}
                    </span>
                  )}
                </>
              )}
              {run.status === "failed" && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  Failed — open for details
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

function SkippedBatchRunCard({ run }: { run: BatchRunResult }) {
  return (
    <div className="flex items-stretch gap-2">
      <div className="flex items-center">
        <span className="h-4 w-4" aria-hidden />
      </div>
      <div className="group relative flex flex-1 overflow-hidden rounded-lg border border-border bg-card">
        <div className="w-1 shrink-0 bg-muted" aria-hidden />
        <div className="flex flex-1 flex-col px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-4 items-center rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                {PERIOD_LABEL[run.period_key] ?? run.period_key}
              </span>
              <span className="flex h-4 items-center rounded bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
                batch
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium capitalize ${statusStyles.skipped}`}
            >
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
  className,
}: BacktestRunsListProps) {
  const selectionCount = selectedRunIds.size;
  const canCompare = selectionCount >= 2 && selectionCount <= MAX_COMPARE;
  const showCompareButton = selectionCount >= 1;
  const compareDisabledReason = !canCompare
    ? selectionCount < 2
      ? "Select at least 2 completed runs"
      : `Maximum ${MAX_COMPARE} runs can be compared`
    : null;

  // Pagination: assume there is a next page only when the current page is full.
  // Always keep the pager visible when the user has paginated past page 1, so a
  // partial last page still offers a way back.
  const hasNextPage = backtests.length === pageSize;
  const showPager = hasNextPage || currentPage > 1;
  const isFirstPage = currentPage <= 1;

  return (
    <TooltipProvider delayDuration={150}>
      <section
        className={cn("rounded border border-border bg-card p-3 sm:p-4", className)}
        aria-labelledby="runs-heading"
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h2 id="runs-heading" className="text-base font-semibold tracking-tight">
            Runs
          </h2>
          <div className="flex items-center gap-2">
            {showCompareButton &&
              (canCompare ? (
                <Button variant="default" size="sm" onClick={onCompare}>
                  Compare ({selectionCount})
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button variant="default" size="sm" disabled aria-disabled>
                        Compare ({selectionCount})
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{compareDisabledReason}</TooltipContent>
                </Tooltip>
              ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoadingBacktests}
                  aria-label="Refresh runs"
                  aria-busy={isLoadingBacktests}
                  className="h-8 px-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoadingBacktests ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh runs</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Comparison selection info banners */}
        {selectionCount > 0 && selectionCount < 2 && (
          <div
            role="status"
            className="mb-3 flex items-center gap-2 rounded-md bg-info/10 px-3 py-2 text-sm text-info"
          >
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Select 2–{MAX_COMPARE} completed runs to compare
          </div>
        )}
        {selectionCount > MAX_COMPARE && (
          <div
            role="status"
            className="mb-3 flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Maximum {MAX_COMPARE} runs can be compared
          </div>
        )}

        {/* Runs list */}
        {backtests.length === 0 && batchSkippedRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-full bg-secondary p-3">
              <BarChart3 className="h-6 w-6 text-muted-foreground/70" aria-hidden />
            </div>
            <p className="text-sm font-medium">No backtests yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Run your first backtest to see results here
            </p>
            <Button size="sm" className="mt-3" onClick={scrollToRunForm}>
              Run a backtest
            </Button>
          </div>
        ) : (
          <ul className="space-y-2" role="list">
            {backtests.map((run) => (
              <li key={run.run_id}>
                <RunCard
                  run={run}
                  isSelected={selectedRunId === run.run_id}
                  selectedRunIds={selectedRunIds}
                  onSelectRun={onSelectRun}
                  onToggleRunSelection={onToggleRunSelection}
                  timezone={timezone}
                />
              </li>
            ))}

            {batchSkippedRuns.length > 0 && (
              <>
                <li
                  className="pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  aria-hidden
                >
                  Skipped periods
                </li>
                {batchSkippedRuns.map((run, idx) => (
                  <li key={`skipped-${run.period_key}-${idx}`}>
                    <SkippedBatchRunCard run={run} />
                  </li>
                ))}
              </>
            )}
          </ul>
        )}

        {/* Pagination */}
        {showPager && (
          <nav
            className="mt-2 flex items-center justify-center gap-1"
            aria-label="Runs pagination"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={isFirstPage}
                  aria-label="Previous page"
                  className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30 dark:bg-secondary/30"
                >
                  <ChevronLeft className="h-3 w-3" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent>Previous page</TooltipContent>
            </Tooltip>
            <span className="px-2 text-xs text-muted-foreground" aria-current="page">
              Page {currentPage}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={!hasNextPage}
                  aria-label="Next page"
                  className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30 dark:bg-secondary/30"
                >
                  <ChevronRight className="h-3 w-3" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent>Next page</TooltipContent>
            </Tooltip>
          </nav>
        )}
      </section>
    </TooltipProvider>
  );
}
