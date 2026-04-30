"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AlertTriangle, Filter, Info, Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { BacktestListItem, BacktestListPage, BacktestStatus } from "@/types/backtest";
import type { TimezoneMode } from "@/lib/format";
import { RunRow } from "@/components/BacktestRunsList";

const PAGE_SIZE = 20;
const MAX_COMPARE = 4;

type StatusFilter = "all" | BacktestStatus;

interface AllRunsDrawerProps {
  open: boolean;
  onClose: () => void;
  strategyId: string;
  timezone: TimezoneMode;
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  selectedRunIds: Set<string>;
  onToggleRunSelection: (runId: string, checked: boolean) => void;
  onCompare: () => void;
}

export function AllRunsDrawer({
  open,
  onClose,
  strategyId,
  timezone,
  selectedRunId,
  onSelectRun,
  selectedRunIds,
  onToggleRunSelection,
  onCompare,
}: AllRunsDrawerProps) {
  const [runs, setRuns] = useState<BacktestListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadRuns = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const offset = (page - 1) * PAGE_SIZE;
        const params = new URLSearchParams({
          strategy_id: strategyId,
          limit: PAGE_SIZE.toString(),
          offset: offset.toString(),
        });
        const data = await apiFetch<BacktestListPage>(`/backtests/?${params.toString()}`);
        setRuns(data.items);
        setTotal(data.total);
      } finally {
        setIsLoading(false);
      }
    },
    [strategyId]
  );

  useEffect(() => {
    if (open) {
      setCurrentPage(1);
      setSearchQuery("");
      setStatusFilter("all");
      loadRuns(1);
    }
  }, [open, loadRuns]);

  const filtered = useMemo(() => {
    let result = runs;
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.created_at.toLowerCase().includes(q) ||
          (r.asset?.toLowerCase().includes(q) ?? false) ||
          (r.period_key?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [runs, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  function handlePageChange(page: number) {
    setCurrentPage(page);
    loadRuns(page);
  }

  const selectionCount = selectedRunIds.size;
  const canCompare = selectionCount >= 2 && selectionCount <= MAX_COMPARE;
  const showCompareButton = selectionCount >= 1;
  const compareDisabledReason = !canCompare
    ? selectionCount < 2
      ? "Select at least 2 completed runs"
      : `Maximum ${MAX_COMPARE} runs can be compared`
    : null;

  function runLabel(globalIdx: number): string {
    const offset = (currentPage - 1) * PAGE_SIZE;
    return `Run #${total - offset - globalIdx}`;
  }

  const statusFilterLabel =
    statusFilter === "all"
      ? "All statuses"
      : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);

  const rangeStart = (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-[560px]"
      >
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <div className="flex items-start justify-between pr-6">
            <div>
              <SheetTitle>All runs</SheetTitle>
              <p className="text-sm text-muted-foreground">{total} total · select to compare</p>
            </div>
            {showCompareButton && (
              canCompare ? (
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
              )
            )}
          </div>
        </SheetHeader>

        {/* Comparison selection banners */}
        {selectionCount > 0 && selectionCount < 2 && (
          <div
            role="status"
            className="flex shrink-0 items-center gap-2 border-b border-border bg-info/5 px-4 py-2 text-sm text-info"
          >
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Select 2–{MAX_COMPARE} completed runs to compare
          </div>
        )}
        {selectionCount > MAX_COMPARE && (
          <div
            role="status"
            className="flex shrink-0 items-center gap-2 border-b border-border bg-warning/5 px-4 py-2 text-sm text-warning"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Maximum {MAX_COMPARE} runs can be compared
          </div>
        )}

        {/* Filters */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by date, asset…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5">
                <Filter className="h-3.5 w-3.5" />
                <span className="text-xs">{statusFilterLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["all", "completed", "running", "pending", "failed"] as const).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                  {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              No runs match your filters
            </div>
          ) : (
            <TooltipProvider delayDuration={150}>
              <ul className="divide-y divide-border" role="list">
                {filtered.map((run) => (
                  <li key={run.run_id}>
                    <RunRow
                      run={run}
                      runLabel={runLabel(runs.indexOf(run))}
                      isSelected={selectedRunId === run.run_id}
                      selectedRunIds={selectedRunIds}
                      onSelectRun={(id) => {
                        onSelectRun(id);
                        onClose();
                      }}
                      onToggleRunSelection={onToggleRunSelection}
                      timezone={timezone}
                    />
                  </li>
                ))}
              </ul>
            </TooltipProvider>
          )}
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex shrink-0 items-center justify-between border-t border-border px-5 py-3">
            <span className="text-xs text-muted-foreground">
              {rangeStart}–{rangeEnd} of {total}
            </span>
            <div className="flex items-center gap-1">
              {pageNumbers.map((page, i) =>
                page === "..." ? (
                  <span
                    key={`dots-${i}`}
                    className="flex h-7 w-7 items-center justify-center text-xs text-muted-foreground"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page as number)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition-colors",
                      page === currentPage
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground hover:bg-muted/50"
                    )}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
