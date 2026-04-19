"use client";

import { DatabaseZap } from "lucide-react";

import { DataCompletenessResponse } from "@/types/backtest";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  data: DataCompletenessResponse;
}

// Minimum visual width so sub-pixel gaps remain tappable/visible.
const MIN_SEGMENT_WIDTH_PERCENT = 0.6;

export function DataCompletenessTimeline({ data }: Props) {
  const {
    coverage_start,
    coverage_end,
    completeness_percent,
    gap_count,
    gap_total_hours,
    gap_ranges,
  } = data;

  // Empty state — explain what's missing and what to do next.
  if (!coverage_start || !coverage_end) {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-4 text-sm"
      >
        <DatabaseZap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">No historical data yet</p>
          <p className="text-xs text-muted-foreground">
            We haven&apos;t ingested OHLCV for this asset and timeframe.
            Try another timeframe or check back shortly once ingestion completes.
          </p>
        </div>
      </div>
    );
  }

  const coverageStartTs = new Date(coverage_start).getTime();
  const coverageEndTs = new Date(coverage_end).getTime();
  const totalDuration = coverageEndTs - coverageStartTs;

  interface Segment {
    type: "data" | "gap";
    start: number;
    end: number;
    widthPercent: number;
    gapInfo?: { start: string; end: string };
  }

  const segments: Segment[] = [];
  let currentPosition = coverageStartTs;

  const sortedGaps = [...gap_ranges].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  for (const gap of sortedGaps) {
    const gapStart = new Date(gap.start).getTime();
    const gapEnd = new Date(gap.end).getTime();

    if (gapStart > currentPosition) {
      segments.push({
        type: "data",
        start: currentPosition,
        end: gapStart,
        widthPercent: ((gapStart - currentPosition) / totalDuration) * 100,
      });
    }

    const rawWidth = ((gapEnd - gapStart) / totalDuration) * 100;
    segments.push({
      type: "gap",
      start: gapStart,
      end: gapEnd,
      // Enforce a minimum width so tiny gaps remain discoverable.
      widthPercent: Math.max(rawWidth, MIN_SEGMENT_WIDTH_PERCENT),
      gapInfo: gap,
    });

    currentPosition = gapEnd;
  }

  if (currentPosition < coverageEndTs) {
    segments.push({
      type: "data",
      start: currentPosition,
      end: coverageEndTs,
      widthPercent: ((coverageEndTs - currentPosition) / totalDuration) * 100,
    });
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Keep precision: weeks → days → hours, combined when useful (e.g. "1d 6h").
  const formatGapDuration = (gap: { start: string; end: string }) => {
    const start = new Date(gap.start).getTime();
    const end = new Date(gap.end).getTime();
    const totalHours = (end - start) / (1000 * 60 * 60);

    if (totalHours < 1) {
      const minutes = Math.max(1, Math.round(totalHours * 60));
      return `${minutes}m`;
    }
    if (totalHours < 24) {
      return `${Math.floor(totalHours)}h`;
    }
    const days = Math.floor(totalHours / 24);
    const hours = Math.floor(totalHours - days * 24);
    if (days < 7) {
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
    const weeks = Math.floor(days / 7);
    const remDays = days - weeks * 7;
    return remDays > 0 ? `${weeks}w ${remDays}d` : `${weeks}w`;
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3">
        {/* Summary with clear hierarchy */}
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold text-foreground">
            {completeness_percent.toFixed(1)}% complete
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(coverage_start)} – {formatDate(coverage_end)}
          </span>
          {gap_count > 0 && (
            <span className="text-xs text-muted-foreground">
              · {gap_count} gap{gap_count > 1 ? "s" : ""} ({gap_total_hours.toFixed(1)}h)
            </span>
          )}
        </div>

        {/* Timeline bar */}
        <div
          role="img"
          aria-label={`Data coverage ${completeness_percent.toFixed(1)} percent complete from ${formatDate(coverage_start)} to ${formatDate(coverage_end)}${gap_count > 0 ? `, with ${gap_count} gap${gap_count > 1 ? "s" : ""}` : ""}`}
          className="relative h-8 overflow-hidden rounded border border-border bg-muted/30"
        >
          <div className="absolute inset-0 flex">
            {segments.map((segment) => {
              const key = `${segment.type}-${segment.start}-${segment.end}`;

              if (segment.type === "data") {
                return (
                  <div
                    key={key}
                    style={{ width: `${segment.widthPercent}%` }}
                    className="bg-success"
                    aria-hidden="true"
                  />
                );
              }

              const label = segment.gapInfo
                ? formatGapDuration(segment.gapInfo)
                : "";
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      style={{ width: `${segment.widthPercent}%` }}
                      aria-label={
                        segment.gapInfo
                          ? `Gap from ${formatDate(segment.gapInfo.start)} to ${formatDate(segment.gapInfo.end)}, ${label}`
                          : "Data gap"
                      }
                      className="relative flex items-center justify-center bg-destructive bg-[repeating-linear-gradient(45deg,hsl(var(--destructive))_0,hsl(var(--destructive))_4px,hsl(var(--destructive-foreground)/0.25)_4px,hsl(var(--destructive-foreground)/0.25)_8px)] focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {segment.widthPercent >= 6 && (
                        <span className="px-1 text-[10px] font-medium text-destructive-foreground">
                          {label}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  {segment.gapInfo && (
                    <TooltipContent>
                      Gap: {formatDate(segment.gapInfo.start)} –{" "}
                      {formatDate(segment.gapInfo.end)} ({label})
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Timeline endpoint labels */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatDate(coverage_start)}</span>
          <span>{formatDate(coverage_end)}</span>
        </div>

        {/* Legend — always visible for clarity */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-success" aria-hidden="true" />
            <span>Data available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-sm bg-destructive bg-[repeating-linear-gradient(45deg,hsl(var(--destructive))_0,hsl(var(--destructive))_2px,hsl(var(--destructive-foreground)/0.35)_2px,hsl(var(--destructive-foreground)/0.35)_4px)]"
              aria-hidden="true"
            />
            <span>Gap</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
