"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";
import type { BacktestListItem } from "@/types/backtest";

const COLLAPSED_KEY = "bb.backtest_rail_collapsed";

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

function compactPeriod(key?: string | null): string {
  if (!key) return "—";
  return COMPACT_PERIOD[key] ?? key;
}

function statusDotClass(status: BacktestListItem["status"]): string {
  switch (status) {
    case "completed":
      return "bg-success";
    case "running":
      return "bg-info";
    case "pending":
      return "bg-warning";
    case "failed":
      return "bg-destructive";
    default:
      return "bg-muted-foreground/40";
  }
}

interface BacktestRunsRailProps {
  backtests: BacktestListItem[];
  isLoadingBacktests: boolean;
  onRefresh: () => void;
  onViewAll: () => void;
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  totalCount?: number;
  runLabelFor: (run: BacktestListItem, idx: number) => string;
  /** Top offset when sticky — in px. Defaults to 0. */
  stickyTop?: number;
  /** Maximum rows to show in the rail before overflow scrolls. */
  maxRows?: number;
}

export function BacktestRunsRail({
  backtests,
  isLoadingBacktests,
  onRefresh,
  onViewAll,
  selectedRunId,
  onSelectRun,
  totalCount,
  runLabelFor,
  stickyTop = 0,
  maxRows = 8,
}: BacktestRunsRailProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  // Suppress rail entirely when only 0–1 runs — no nav value.
  if (backtests.length <= 1) {
    return null;
  }

  const visible = backtests.slice(0, maxRows);
  const hasMore =
    (totalCount != null && totalCount > visible.length) ||
    backtests.length > visible.length;

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        aria-label="Recent runs"
        className={cn(
          "sticky hidden self-start lg:block",
          collapsed ? "w-[44px]" : "w-[220px]"
        )}
        style={{ top: stickyTop }}
      >
        <div className="overflow-hidden rounded border border-border bg-card">
          {/* Header */}
          <div
            className={cn(
              "flex items-center border-b border-border",
              collapsed ? "justify-center px-1 py-2" : "justify-between px-2.5 py-2"
            )}
          >
            {!collapsed && (
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Runs
                {totalCount != null ? ` · ${totalCount}` : ""}
              </span>
            )}
            <div className="flex items-center gap-0.5">
              {!collapsed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onRefresh}
                      disabled={isLoadingBacktests}
                      aria-label="Refresh runs"
                      aria-busy={isLoadingBacktests}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw
                        className={cn("h-3 w-3", isLoadingBacktests && "animate-spin")}
                        aria-hidden
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh runs</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCollapsed((v) => !v)}
                    aria-label={collapsed ? "Expand runs rail" : "Collapse runs rail"}
                    aria-expanded={!collapsed}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    {collapsed ? (
                      <ChevronLeft className="h-3 w-3" aria-hidden />
                    ) : (
                      <ChevronRight className="h-3 w-3" aria-hidden />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {collapsed ? "Expand rail" : "Collapse rail"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Rows */}
          <ul className="divide-y divide-border" role="list">
            {visible.map((run, idx) => {
              const isSelected = selectedRunId === run.run_id;
              const isPositive = (run.total_return ?? 0) >= 0;
              const label = runLabelFor(run, idx);
              const periodLabel = compactPeriod(run.period_key);
              const row = (
                <button
                  type="button"
                  onClick={() => onSelectRun(run.run_id)}
                  aria-pressed={isSelected}
                  aria-label={
                    run.status === "completed"
                      ? `${label}, ${periodLabel}, return ${formatPercent(run.total_return)}`
                      : `${label}, ${periodLabel}, status ${run.status}`
                  }
                  className={cn(
                    "relative flex w-full items-center gap-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
                    collapsed ? "justify-center px-1" : "px-2.5",
                    isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                  )}
                >
                  {isSelected && (
                    <span
                      className="absolute left-0 top-0 h-full w-[2px] bg-primary"
                      aria-hidden
                    />
                  )}

                  {collapsed ? (
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        statusDotClass(run.status)
                      )}
                      aria-hidden
                    />
                  ) : (
                    <>
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          statusDotClass(run.status)
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 font-mono text-[11px] tabular-nums">
                        <span
                          className={cn(
                            "font-semibold",
                            isSelected ? "text-foreground" : "text-foreground/80"
                          )}
                        >
                          #{label.replace(/^Run #/, "")}
                        </span>
                        <span className="ml-1.5 text-muted-foreground">
                          {periodLabel}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[11px] font-semibold tabular-nums",
                          run.status === "completed"
                            ? isPositive
                              ? "text-success"
                              : "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {run.status === "completed"
                          ? `${isPositive ? "+" : ""}${formatPercent(run.total_return)}`
                          : run.status === "running"
                            ? "…"
                            : run.status === "pending"
                              ? "·"
                              : run.status === "failed"
                                ? "!"
                                : "—"}
                      </span>
                    </>
                  )}
                </button>
              );

              return (
                <li key={run.run_id}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{row}</TooltipTrigger>
                      <TooltipContent side="right">
                        {run.status === "completed"
                          ? `${label} · ${periodLabel} · ${isPositive ? "+" : ""}${formatPercent(run.total_return)}`
                          : `${label} · ${periodLabel} · ${run.status}`}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>

          {/* Footer */}
          {hasMore && !collapsed && (
            <button
              type="button"
              onClick={onViewAll}
              className="flex w-full items-center justify-between border-t border-border px-2.5 py-1.5 text-left text-[11px] font-medium text-primary transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span>View all</span>
              <span className="font-mono text-muted-foreground">
                {totalCount ?? backtests.length}
              </span>
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
