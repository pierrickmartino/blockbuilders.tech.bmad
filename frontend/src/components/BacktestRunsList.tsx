"use client";

import {
  AlertTriangle,
  BarChart3,
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
import { formatDateTime, formatPercent, type TimezoneMode } from "@/lib/format";
import type { BacktestListItem, BacktestStatus, BatchRunResult } from "@/types/backtest";

interface BacktestRunsListProps {
  backtests: BacktestListItem[];
  batchSkippedRuns: BatchRunResult[];
  isLoadingBacktests: boolean;
  onRefresh: () => void;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onViewAll?: () => void;
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  selectedRunIds: Set<string>;
  onToggleRunSelection: (runId: string, checked: boolean) => void;
  onCompare: () => void;
  timezone: TimezoneMode;
  totalCount?: number;
  className?: string;
}

const MAX_COMPARE = 4;

function scrollToRunForm() {
  if (typeof document === "undefined") return;
  const el = document.getElementById("run-backtest-form");
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** "Apr 11 · 16:24" compact format */
function formatCompactDateTime(dateStr: string, timezone: TimezoneMode): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  if (timezone === "utc") opts.timeZone = "UTC";
  const parts = new Intl.DateTimeFormat("en-US", opts).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("month")} ${get("day")} · ${get("hour")}:${get("minute")}`;
}

const COMPACT_PERIOD: Record<string, string> = {
  "30d": "1M",
  "60d": "2M",
  "90d": "3M",
  "120d": "4M",
  "180d": "6M",
  "1y": "1Y",
  "2y": "2Y",
  "3y": "3Y",
};

function compactPeriodLabel(key: string): string {
  return COMPACT_PERIOD[key] ? `${COMPACT_PERIOD[key]} window` : key;
}

const STATUS_BADGE: Record<
  BacktestStatus,
  { bg: string; text: string; label: string }
> = {
  completed: {
    bg: "bg-[hsl(var(--success)/0.12)] dark:bg-[hsl(var(--success)/0.18)]",
    text: "text-success",
    label: "Completed",
  },
  running: {
    bg: "bg-[hsl(var(--info)/0.12)] dark:bg-[hsl(var(--info)/0.18)]",
    text: "text-info",
    label: "Running",
  },
  pending: {
    bg: "bg-[hsl(var(--warning)/0.12)] dark:bg-[hsl(var(--warning)/0.18)]",
    text: "text-warning",
    label: "Queued",
  },
  failed: {
    bg: "bg-[hsl(var(--destructive)/0.12)] dark:bg-[hsl(var(--destructive)/0.18)]",
    text: "text-destructive",
    label: "Failed",
  },
  skipped: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    label: "Skipped",
  },
};

function StatusBadge({ status }: { status: BacktestStatus }) {
  const style = STATUS_BADGE[status] ?? STATUS_BADGE.skipped;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        style.bg,
        style.text
      )}
    >
      {status === "running" ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      )}
      {style.label}
    </span>
  );
}

function PerfCell({ run }: { run: BacktestListItem }) {
  const isPositive = (run.total_return ?? 0) >= 0;

  if (run.status === "completed") {
    return (
      <div className="text-right">
        <div
          className={cn(
            "text-base font-bold tabular-nums",
            isPositive ? "text-success" : "text-destructive"
          )}
        >
          {isPositive ? (
            <TrendingUp className="mr-0.5 inline h-3.5 w-3.5" aria-hidden />
          ) : (
            <TrendingDown className="mr-0.5 inline h-3.5 w-3.5" aria-hidden />
          )}
          {isPositive ? "+" : ""}
          {formatPercent(run.total_return)}
        </div>
        {run.sharpe_ratio != null && (
          <div className="text-xs text-muted-foreground tabular-nums">
            Sharpe {run.sharpe_ratio.toFixed(2)}
          </div>
        )}
        {run.max_drawdown != null && run.sharpe_ratio == null && (
          <div className="text-xs text-muted-foreground tabular-nums">
            DD {formatPercent(run.max_drawdown)}
          </div>
        )}
      </div>
    );
  }

  if (run.status === "running") {
    const elapsedLabel =
      run.elapsed_seconds != null
        ? run.elapsed_seconds >= 60
          ? `${Math.floor(run.elapsed_seconds / 60)}m ${Math.round(run.elapsed_seconds % 60)}s`
          : `${Math.round(run.elapsed_seconds)}s`
        : null;
    return (
      <div className="text-right">
        <div className="text-sm font-medium text-muted-foreground">— —</div>
        <div className="text-xs text-info">
          {elapsedLabel ? `Running ${elapsedLabel}` : "Running…"}
        </div>
      </div>
    );
  }

  if (run.status === "pending") {
    return (
      <div className="text-right">
        <div className="text-sm font-medium text-muted-foreground">— —</div>
        <div className="text-xs text-warning">Waiting in queue</div>
      </div>
    );
  }

  if (run.status === "failed") {
    return (
      <div className="text-right">
        <div className="text-sm font-medium text-muted-foreground">—</div>
        <div className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
          <AlertTriangle className="h-3 w-3" aria-hidden />
          Failed
        </div>
      </div>
    );
  }

  return <div className="text-sm text-muted-foreground">—</div>;
}

export function RunRow({
  run,
  runLabel,
  isSelected,
  selectedRunIds,
  onSelectRun,
  onToggleRunSelection,
  timezone,
}: {
  run: BacktestListItem;
  runLabel: string;
  isSelected: boolean;
  selectedRunIds: Set<string>;
  onSelectRun: (runId: string) => void;
  onToggleRunSelection: (runId: string, checked: boolean) => void;
  timezone: TimezoneMode;
}) {
  const canSelectForCompare = run.status === "completed";
  const isChecked = selectedRunIds.has(run.run_id);
  const atLimit = !isChecked && selectedRunIds.size >= MAX_COMPARE;
  const isCheckboxDisabled = canSelectForCompare ? atLimit : !isChecked;

  const disabledReason = !canSelectForCompare
    ? "Only completed runs can be compared"
    : atLimit
      ? `Maximum ${MAX_COMPARE} runs can be compared`
      : null;

  const absoluteDate = formatDateTime(run.created_at, timezone);
  const rowLabel = `${runLabel} from ${absoluteDate}${
    run.status === "completed"
      ? `, return ${formatPercent(run.total_return)}`
      : `, status ${run.status}`
  }`;

  const metaParts: string[] = [formatCompactDateTime(run.created_at, timezone)];
  if (run.period_key) metaParts.push(compactPeriodLabel(run.period_key));

  const checkbox = (
    <label
      className="flex h-full cursor-pointer items-center"
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
    <div
      className={cn(
        "relative flex items-stretch transition-colors",
        isSelected ? "bg-primary/5" : "hover:bg-muted/30"
      )}
    >
      {/* Left accent bar */}
      {isSelected && (
        <div
          className="absolute left-0 top-0 h-full w-[3px] bg-primary"
          aria-hidden
        />
      )}

      {/* Checkbox */}
      <div className="flex items-center pl-4 pr-2">
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
      </div>

      {/* Row button */}
      <button
        type="button"
        onClick={() => onSelectRun(run.run_id)}
        aria-pressed={isSelected}
        aria-label={rowLabel}
        className="flex flex-1 items-center gap-3 py-3 pr-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {/* Title + meta */}
        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold leading-tight">{runLabel}</span>
            <StatusBadge status={run.status} />
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            {metaParts.join(" · ")}
          </p>
        </div>

        {/* Performance */}
        <div className="flex-shrink-0">
          <PerfCell run={run} />
        </div>
      </button>
    </div>
  );
}

function SkippedBatchRunRow({ run }: { run: BatchRunResult }) {
  return (
    <div className="relative flex items-stretch hover:bg-muted/30">
      <div className="flex items-center pl-4 pr-2">
        <span className="h-4 w-4" aria-hidden />
      </div>
      <div className="flex flex-1 items-center gap-3 py-3 pr-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold leading-tight">Skipped</span>
            {run.period_key && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {compactPeriodLabel(run.period_key)}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {run.skip_reason ?? "This period was skipped."}
          </p>
        </div>
        <div className="flex-shrink-0 text-sm text-muted-foreground">—</div>
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
  onViewAll,
  selectedRunId,
  onSelectRun,
  selectedRunIds,
  onToggleRunSelection,
  onCompare,
  timezone,
  totalCount,
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

  const hasNextPage = backtests.length === pageSize;
  const showPager = hasNextPage || currentPage > 1;
  const isFirstPage = currentPage <= 1;

  const shownCount = backtests.length;

  /** Compute a display label for a run. Descending order if totalCount known. */
  function runLabel(idx: number): string {
    if (totalCount != null) {
      const num = totalCount - (currentPage - 1) * pageSize - idx;
      return `Run #${num}`;
    }
    const num = (currentPage - 1) * pageSize + idx + 1;
    return `Run #${num}`;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <section
        className={cn(
          "overflow-hidden rounded border border-border bg-card",
          className
        )}
        aria-labelledby="runs-heading"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-4 py-3">
          <div>
            <h2 id="runs-heading" className="text-[15px] font-semibold">
              Recent runs
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {totalCount != null ? `${totalCount} total` : `${shownCount} shown`}
              {" · select to compare"}
            </p>
          </div>
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
                    className={cn("h-4 w-4", isLoadingBacktests && "animate-spin")}
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
            className="flex items-center gap-2 border-b border-border bg-info/5 px-4 py-2 text-sm text-info"
          >
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Select 2–{MAX_COMPARE} completed runs to compare
          </div>
        )}
        {selectionCount > MAX_COMPARE && (
          <div
            role="status"
            className="flex items-center gap-2 border-b border-border bg-warning/5 px-4 py-2 text-sm text-warning"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Maximum {MAX_COMPARE} runs can be compared
          </div>
        )}

        {/* Runs list */}
        {backtests.length === 0 && batchSkippedRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
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
          <ul className="divide-y divide-border" role="list">
            {backtests.map((run, idx) => (
              <li key={run.run_id}>
                <RunRow
                  run={run}
                  runLabel={runLabel(idx)}
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
                  className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  aria-hidden
                >
                  Skipped periods
                </li>
                {batchSkippedRuns.map((run, idx) => (
                  <li key={`skipped-${run.period_key}-${idx}`}>
                    <SkippedBatchRunRow run={run} />
                  </li>
                ))}
              </>
            )}
          </ul>
        )}

        {/* Footer */}
        {(shownCount > 0 || showPager) && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">
              Showing {shownCount}
              {totalCount != null ? ` of ${totalCount}` : ""}
            </span>
            <div className="flex items-center gap-3">
              {!isFirstPage && (
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  ← Previous
                </button>
              )}
              {hasNextPage && (
                <button
                  type="button"
                  onClick={() =>
                    onViewAll ? onViewAll() : onPageChange(currentPage + 1)
                  }
                  className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  View all →
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </TooltipProvider>
  );
}
