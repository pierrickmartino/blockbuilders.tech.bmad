"use client";

import {
  AlertTriangle,
  Info,
  Play,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/backtest/StatusBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatPercent, type TimezoneMode } from "@/lib/format";
import type { BacktestListItem, BatchRunResult } from "@/types/backtest";

const MAX_COMPARE = 4;

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

function compactPeriodLabel(key?: string | null): string | null {
  if (!key) return null;
  return COMPACT_PERIOD[key] ? `${COMPACT_PERIOD[key]} window` : key;
}

/** "Apr 11 · 16:24" */
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

interface BandCardProps {
  run: BacktestListItem;
  runLabel: string;
  isSelected: boolean;
  isChecked: boolean;
  isCheckboxDisabled: boolean;
  disabledReason: string | null;
  onSelectRun: (runId: string) => void;
  onToggleRunSelection: (runId: string, checked: boolean) => void;
  onCancelRun?: (runId: string) => void;
  timezone: TimezoneMode;
}

function BandCard({
  run,
  runLabel,
  isSelected,
  isChecked,
  isCheckboxDisabled,
  disabledReason,
  onSelectRun,
  onToggleRunSelection,
  onCancelRun,
  timezone,
}: BandCardProps) {
  const isPositive = (run.total_return ?? 0) >= 0;
  const periodLabel = compactPeriodLabel(run.period_key);
  const datetimeLabel = formatCompactDateTime(run.created_at, timezone);
  const isCancellable =
    Boolean(onCancelRun) && (run.status === "pending" || run.status === "running");

  const checkbox = (
    <label
      className="flex cursor-pointer items-center"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="sr-only">Select {runLabel} for comparison</span>
      <input
        type="checkbox"
        checked={isChecked}
        onChange={(e) => {
          if (run.status !== "completed" && e.target.checked) return;
          onToggleRunSelection(run.run_id, e.target.checked);
        }}
        disabled={isCheckboxDisabled}
        className="h-3.5 w-3.5 rounded border-border text-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-40"
      />
    </label>
  );

  return (
    <div
      className={cn(
        "group relative flex min-w-[240px] snap-start flex-col rounded border bg-card transition-colors",
        isSelected
          ? "border-primary/50 bg-primary/[0.03]"
          : "border-border hover:border-primary/30"
      )}
    >
      {isSelected && (
        <div
          className="absolute left-0 right-0 top-0 h-[2px] rounded-t bg-primary"
          aria-hidden
        />
      )}

      <button
        type="button"
        onClick={() => onSelectRun(run.run_id)}
        aria-pressed={isSelected}
        aria-label={runLabel}
        className="flex flex-1 flex-col gap-2 px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {/* Row 1: Run # + status */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold leading-none">{runLabel}</span>
          <StatusBadge status={run.status} />
        </div>

        {/* Row 2: period · datetime */}
        <div className="font-mono text-[11px] text-muted-foreground">
          {[periodLabel, datetimeLabel].filter(Boolean).join(" · ")}
        </div>

        {/* Row 3: return % big */}
        <div className="pt-0.5">
          {run.status === "completed" ? (
            <div
              className={cn(
                "font-mono text-xl font-semibold tabular-nums leading-none",
                isPositive ? "text-success" : "text-destructive"
              )}
            >
              {isPositive ? (
                <TrendingUp className="mr-1 inline h-4 w-4" aria-hidden />
              ) : (
                <TrendingDown className="mr-1 inline h-4 w-4" aria-hidden />
              )}
              {isPositive ? "+" : ""}
              {formatPercent(run.total_return)}
            </div>
          ) : run.status === "running" ? (
            <div className="font-mono text-xl font-semibold tabular-nums leading-none text-info">
              <span className="relative mr-2 inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-info/70 motion-reduce:animate-none" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-info" />
              </span>
              Running
              {run.elapsed_seconds != null && (
                <span className="ml-1 text-xs text-info/80">
                  {run.elapsed_seconds >= 60
                    ? `${Math.floor(run.elapsed_seconds / 60)}m ${Math.round(run.elapsed_seconds % 60)}s`
                    : `${Math.round(run.elapsed_seconds)}s`}
                </span>
              )}
            </div>
          ) : run.status === "pending" ? (
            <div className="font-mono text-xl font-semibold tabular-nums leading-none text-warning">
              Queued
            </div>
          ) : run.status === "failed" ? (
            <div className="font-mono text-xl font-semibold tabular-nums leading-none text-destructive">
              Failed
            </div>
          ) : (
            <div className="font-mono text-xl font-semibold tabular-nums leading-none text-muted-foreground">
              —
            </div>
          )}
        </div>

        {/* Row 4: sharpe + dd */}
        <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {run.status === "completed" && run.sharpe_ratio != null && run.max_drawdown != null
            ? `Sharpe ${run.sharpe_ratio.toFixed(2)} · DD ${formatPercent(run.max_drawdown)}`
            : run.status === "completed" && run.sharpe_ratio != null
              ? `Sharpe ${run.sharpe_ratio.toFixed(2)}`
              : run.status === "completed" && run.max_drawdown != null
                ? `DD ${formatPercent(run.max_drawdown)}`
                : "\u00A0"}
        </div>
      </button>

      {/* Top-right action — cancel for pending/running, compare checkbox otherwise */}
      {isCancellable ? (
        <div className="absolute right-1.5 top-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelRun?.(run.run_id);
                }}
                aria-label={`Cancel ${runLabel}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded border border-border bg-background/90 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent>Cancel run</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div
          className={cn(
            "absolute right-2 top-2 transition-opacity",
            isChecked
              ? "opacity-100"
              : "opacity-40 group-hover:opacity-100 group-focus-within:opacity-100"
          )}
        >
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
      )}
    </div>
  );
}

interface BacktestRunsBandProps {
  backtests: BacktestListItem[];
  batchSkippedRuns: BatchRunResult[];
  isLoadingBacktests: boolean;
  onRefresh: () => void;
  onViewAll: () => void;
  onOpenRunSheet: () => void;
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  selectedRunIds: Set<string>;
  onToggleRunSelection: (runId: string, checked: boolean) => void;
  onCompare: () => void;
  onCancelRun?: (runId: string) => void;
  timezone: TimezoneMode;
  totalCount?: number;
  /** Label prefix for runs — computed from totalCount or offsets. */
  runLabelFor: (run: BacktestListItem, idx: number) => string;
  /** Cap on visible cards; extras surface via View all. */
  maxVisible?: number;
}

export function BacktestRunsBand({
  backtests,
  batchSkippedRuns,
  isLoadingBacktests,
  onRefresh,
  onViewAll,
  onOpenRunSheet,
  selectedRunId,
  onSelectRun,
  selectedRunIds,
  onToggleRunSelection,
  onCompare,
  onCancelRun,
  timezone,
  totalCount,
  runLabelFor,
  maxVisible = 5,
}: BacktestRunsBandProps) {
  const selectionCount = selectedRunIds.size;
  const canCompare = selectionCount >= 2 && selectionCount <= MAX_COMPARE;
  const showCompareButton = selectionCount >= 1;
  const compareDisabledReason = !canCompare
    ? selectionCount < 2
      ? "Select at least 2 completed runs"
      : `Maximum ${MAX_COMPARE} runs can be compared`
    : null;

  const visibleRuns = backtests.slice(0, maxVisible);
  const hasMore =
    (totalCount != null && totalCount > visibleRuns.length) ||
    backtests.length > visibleRuns.length;

  // Empty state: no runs at all and none skipped
  if (backtests.length === 0 && batchSkippedRuns.length === 0) {
    return (
      <section
        aria-labelledby="runs-band-heading"
        className="overflow-hidden rounded border border-dashed border-border bg-card"
      >
        <div className="flex flex-col items-start gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div>
              <h2
                id="runs-band-heading"
                className="text-[15px] font-semibold leading-tight"
              >
                No backtests yet
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Run your first backtest to see results here.
              </p>
            </div>
          </div>
          <Button onClick={onOpenRunSheet} className="gap-2">
            <Play className="h-3.5 w-3.5" />
            Run your first backtest
          </Button>
        </div>
      </section>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <section
        aria-labelledby="runs-band-heading"
        className="overflow-hidden rounded border border-border bg-card"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-5">
          <div className="flex items-baseline gap-3">
            <h2 id="runs-band-heading" className="text-[15px] font-semibold leading-none">
              Recent runs
            </h2>
            <p className="font-mono text-[11px] leading-none text-muted-foreground">
              {totalCount != null ? `${totalCount} total` : `${backtests.length} shown`}
              {" · select to compare"}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {hasMore && (
              <button
                type="button"
                onClick={onViewAll}
                className="h-7 rounded px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                View all{" "}
                <span className="font-mono text-muted-foreground/70">
                  ({totalCount != null ? totalCount : `${backtests.length}+`})
                </span>
              </button>
            )}
            {showCompareButton &&
              (canCompare ? (
                <Button variant="default" size="sm" onClick={onCompare} className="h-7">
                  Compare ({selectionCount})
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button variant="default" size="sm" disabled aria-disabled className="h-7">
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
                  className="h-7 px-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", isLoadingBacktests && "animate-spin")}
                    aria-hidden
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh runs</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Selection banners */}
        {selectionCount > 0 && selectionCount < 2 && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="flex items-center gap-2 border-b border-border bg-info/5 px-4 py-1.5 text-xs text-info"
          >
            <Info className="h-3 w-3 shrink-0" aria-hidden />
            Select 2–{MAX_COMPARE} completed runs to compare
          </div>
        )}
        {selectionCount > MAX_COMPARE && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="flex items-center gap-2 border-b border-border bg-warning/5 px-4 py-1.5 text-xs text-warning"
          >
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
            Limit of {MAX_COMPARE} runs reached
          </div>
        )}

        {/* Cards — horizontal scroll with snap */}
        <div className="overflow-x-auto">
          <div className="flex gap-3 px-4 py-3 sm:px-5">
            {visibleRuns.map((run, idx) => {
              const isSelected = selectedRunId === run.run_id;
              const isChecked = selectedRunIds.has(run.run_id);
              const atLimit = !isChecked && selectedRunIds.size >= MAX_COMPARE;
              const canSelectForCompare = run.status === "completed";
              const isCheckboxDisabled = canSelectForCompare ? atLimit : !isChecked;
              const disabledReason = !canSelectForCompare
                ? "Only completed runs can be compared"
                : atLimit
                  ? `Maximum ${MAX_COMPARE} runs can be compared`
                  : null;

              return (
                <BandCard
                  key={run.run_id}
                  run={run}
                  runLabel={runLabelFor(run, idx)}
                  isSelected={isSelected}
                  isChecked={isChecked}
                  isCheckboxDisabled={isCheckboxDisabled}
                  disabledReason={disabledReason}
                  onSelectRun={onSelectRun}
                  onToggleRunSelection={onToggleRunSelection}
                  onCancelRun={onCancelRun}
                  timezone={timezone}
                />
              );
            })}

          </div>
        </div>

        {/* Skipped batch runs footer */}
        {batchSkippedRuns.length > 0 && (
          <div className="border-t border-border bg-muted/20 px-4 py-2 font-mono text-[11px] text-muted-foreground sm:px-5">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Skipped this batch
            </span>
            <span className="mx-1.5 text-muted-foreground/60">·</span>
            {batchSkippedRuns
              .map((r) => compactPeriodLabel(r.period_key) ?? r.period_key)
              .filter(Boolean)
              .join(", ")}
          </div>
        )}
      </section>
    </TooltipProvider>
  );
}
