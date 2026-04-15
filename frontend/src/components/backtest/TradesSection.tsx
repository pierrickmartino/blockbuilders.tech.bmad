"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TradeDetail } from "@/types/backtest";
import { formatDateTime, formatPrice, formatMoney, formatPercent, formatDuration, type TimezoneMode } from "@/lib/format";
import { exportTradesToCSV, exportTradesToJSON } from "@/lib/backtest-export";
import { Search, Download, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

type SideFilter = "all" | "long" | "short";

interface TradesSectionProps {
  trades: TradeDetail[];
  selectedRunId: string;
  timezone: TimezoneMode;
  onSelectTrade: (idx: number) => void;
  tradesCurrentPage: number;
  tradesPageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function TradesSection({
  trades,
  selectedRunId,
  timezone,
  onSelectTrade,
  tradesCurrentPage,
  tradesPageSize,
  onPageChange,
  onPageSizeChange,
}: TradesSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sideFilter, setSideFilter] = useState<SideFilter>("all");

  const filteredTrades = useMemo(() => {
    let result = trades;
    if (sideFilter !== "all") {
      result = result.filter((t) => t.side.toLowerCase() === sideFilter);
    }
    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(
      (t) =>
        t.side.toLowerCase().includes(q) ||
        formatPrice(t.entry_price).toLowerCase().includes(q) ||
        formatPrice(t.exit_price).toLowerCase().includes(q) ||
        formatDateTime(t.entry_time, timezone).toLowerCase().includes(q)
    );
  }, [trades, searchQuery, sideFilter, timezone]);

  const totalPages = Math.ceil(filteredTrades.length / tradesPageSize);
  const paginatedTrades = filteredTrades.slice(
    (tradesCurrentPage - 1) * tradesPageSize,
    tradesCurrentPage * tradesPageSize
  );

  const wins = trades.filter((t) => t.pnl >= 0).length;
  const losses = trades.length - wins;

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (tradesCurrentPage > 3) pages.push("...");
      for (let i = Math.max(2, tradesCurrentPage - 1); i <= Math.min(totalPages - 1, tradesCurrentPage + 1); i++) {
        pages.push(i);
      }
      if (tradesCurrentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, tradesCurrentPage]);

  const sideFilterLabel = sideFilter === "all" ? "All" : sideFilter === "long" ? "Long" : "Short";

  return (
    <div className="rounded border border-border bg-card">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Trades</h2>
          <p className="text-xs text-muted-foreground">
            Chronological order &middot; {wins} wins, {losses} losses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search trades..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onPageChange(1);
              }}
              className="h-8 w-[180px] pl-8 text-xs sm:w-[200px]"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5">
                <Filter className="h-3.5 w-3.5" />
                <span className="text-xs">{sideFilterLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSideFilter("all"); onPageChange(1); }}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSideFilter("long"); onPageChange(1); }}>
                Long
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSideFilter("short"); onPageChange(1); }}>
                Short
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {trades.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5">
                  <Download className="h-3.5 w-3.5" />
                  <span className="text-xs">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportTradesToCSV(trades, selectedRunId)}>
                  Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportTradesToJSON(trades, selectedRunId)}>
                  Download JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Table header row */}
      <div className="hidden border-b border-border bg-muted/40 px-5 py-2.5 md:flex">
        <div className="w-10 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">#</div>
        <div className="w-24 px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Side</div>
        <div className="flex-1 px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Entry</div>
        <div className="flex-1 px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Exit</div>
        <div className="w-20 px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Duration</div>
        <div className="w-36 px-2 text-right font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">P&L</div>
        <div className="w-20 px-2 text-right font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">P&L %</div>
        <div className="w-20 px-2 text-right font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Costs</div>
      </div>

      {/* Table body */}
      {trades.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">No trades were generated for this run.</p>
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="divide-y divide-border md:hidden">
            {paginatedTrades.map((trade, idx) => {
              const globalIdx = (tradesCurrentPage - 1) * tradesPageSize + idx;
              return (
                <button
                  key={`${trade.entry_time}-${idx}`}
                  className="w-full px-4 py-3 text-left transition hover:bg-muted/30"
                  onClick={() => onSelectTrade(globalIdx)}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">#{globalIdx + 1}</span>
                      <span className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase",
                        trade.side === "long"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      )}>
                        {trade.side}
                      </span>
                    </div>
                    <span className={cn(
                      "font-mono text-sm font-semibold",
                      trade.pnl >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {trade.pnl_pct >= 0 ? "+" : ""}{formatPercent(trade.pnl_pct)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Entry</div>
                      <div className="font-mono font-medium">{formatPrice(trade.entry_price)}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{formatDateTime(trade.entry_time, timezone)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Exit</div>
                      <div className="font-mono font-medium">{formatPrice(trade.exit_price)}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{formatDateTime(trade.exit_time, timezone)}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop row layout */}
          <div className="hidden divide-y divide-border md:block">
            {paginatedTrades.map((trade, idx) => {
              const globalIdx = (tradesCurrentPage - 1) * tradesPageSize + idx;
              return (
                <button
                  key={`${trade.entry_time}-${idx}`}
                  className="flex w-full items-center px-5 py-3 text-left transition hover:bg-muted/30"
                  onClick={() => onSelectTrade(globalIdx)}
                >
                  <div className="w-10 font-mono text-xs text-muted-foreground">
                    {globalIdx + 1}
                  </div>
                  <div className="w-24 px-2">
                    <span className={cn(
                      "rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase",
                      trade.side === "long"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    )}>
                      {trade.side}
                    </span>
                  </div>
                  <div className="flex-1 space-y-0.5 px-2">
                    <div className="font-mono text-xs font-medium">{formatPrice(trade.entry_price)}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {formatDateTime(trade.entry_time, timezone)}
                    </div>
                  </div>
                  <div className="flex-1 space-y-0.5 px-2">
                    <div className="font-mono text-xs font-medium">{formatPrice(trade.exit_price)}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {formatDateTime(trade.exit_time, timezone)}
                    </div>
                  </div>
                  <div className="w-20 px-2 font-mono text-xs text-muted-foreground">
                    {trade.duration_seconds != null
                      ? formatDuration(trade.duration_seconds)
                      : "—"}
                  </div>
                  <div className={cn(
                    "w-36 px-2 text-right font-mono text-xs font-medium",
                    trade.pnl >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {formatMoney(trade.pnl, "USDT", true)}
                  </div>
                  <div className={cn(
                    "w-20 px-2 text-right font-mono text-xs",
                    trade.pnl_pct >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {trade.pnl_pct >= 0 ? "+" : ""}{formatPercent(trade.pnl_pct)}
                  </div>
                  <div className="w-20 px-2 text-right font-mono text-xs text-muted-foreground">
                    {trade.total_cost_usd != null
                      ? formatMoney(trade.total_cost_usd, "USDT", false)
                      : "—"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer / Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Showing {(tradesCurrentPage - 1) * tradesPageSize + 1}&ndash;
                  {Math.min(tradesCurrentPage * tradesPageSize, filteredTrades.length)} of{" "}
                  {filteredTrades.length}
                </span>
                <div className="h-3.5 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Rows:</span>
                  <Select
                    value={String(tradesPageSize)}
                    onValueChange={(v) => {
                      onPageSizeChange(Number(v));
                      onPageChange(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-[60px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {pageNumbers.map((page, i) =>
                  page === "..." ? (
                    <span key={`dots-${i}`} className="flex h-7 w-7 items-center justify-center text-xs text-muted-foreground">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => onPageChange(page as number)}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition-colors",
                        page === tradesCurrentPage
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
        </>
      )}
    </div>
  );
}
