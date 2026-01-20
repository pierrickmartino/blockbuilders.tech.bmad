"use client";

import { DataCompletenessResponse } from "@/types/backtest";

interface Props {
  data: DataCompletenessResponse;
}

export function DataCompletenessTimeline({
  data,
}: Props) {
  const {
    coverage_start,
    coverage_end,
    completeness_percent,
    gap_count,
    gap_total_hours,
    gap_ranges,
  } = data;

  // Handle case where no data exists
  if (!coverage_start || !coverage_end) {
    return (
      <div className="text-sm text-gray-500">
        No historical data available for this asset/timeframe.
      </div>
    );
  }

  const coverageStartTs = new Date(coverage_start).getTime();
  const coverageEndTs = new Date(coverage_end).getTime();
  const totalDuration = coverageEndTs - coverageStartTs;

  // Calculate segments (alternating between available data and gaps)
  interface Segment {
    type: "data" | "gap";
    start: number;
    end: number;
    widthPercent: number;
    gapInfo?: { start: string; end: string };
  }

  const segments: Segment[] = [];
  let currentPosition = coverageStartTs;

  // Sort gaps by start time
  const sortedGaps = [...gap_ranges].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  for (const gap of sortedGaps) {
    const gapStart = new Date(gap.start).getTime();
    const gapEnd = new Date(gap.end).getTime();

    // Add data segment before gap (if any)
    if (gapStart > currentPosition) {
      const widthPercent = ((gapStart - currentPosition) / totalDuration) * 100;
      segments.push({
        type: "data",
        start: currentPosition,
        end: gapStart,
        widthPercent,
      });
    }

    // Add gap segment
    const widthPercent = ((gapEnd - gapStart) / totalDuration) * 100;
    segments.push({
      type: "gap",
      start: gapStart,
      end: gapEnd,
      widthPercent,
      gapInfo: gap,
    });

    currentPosition = gapEnd;
  }

  // Add final data segment (if any)
  if (currentPosition < coverageEndTs) {
    const widthPercent = ((coverageEndTs - currentPosition) / totalDuration) * 100;
    segments.push({
      type: "data",
      start: currentPosition,
      end: coverageEndTs,
      widthPercent,
    });
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format gap duration
  const formatGapDuration = (gap: { start: string; end: string }) => {
    const start = new Date(gap.start);
    const end = new Date(gap.end);
    const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    if (hours < 24) {
      return `${hours}h`;
    }
    const days = Math.round(hours / 24);
    return `${days}d`;
  };

  // Generate summary text
  const summaryText = `${completeness_percent.toFixed(1)}% complete from ${formatDate(coverage_start)} to ${formatDate(coverage_end)}${gap_count > 0 ? `, ${gap_count} gap${gap_count > 1 ? "s" : ""} totaling ${gap_total_hours.toFixed(1)} hours` : ""}`;

  return (
    <div className="space-y-2">
      {/* Timeline bar */}
      <div className="relative h-8 rounded border border-gray-200 bg-gray-50 overflow-hidden">
        <div className="absolute inset-0 flex">
          {segments.map((segment, idx) => (
            <div
              key={idx}
              style={{ width: `${segment.widthPercent}%` }}
              className={`relative ${
                segment.type === "data"
                  ? "bg-green-500"
                  : "bg-red-400"
              } group`}
              title={
                segment.type === "gap" && segment.gapInfo
                  ? `Gap: ${formatDate(segment.gapInfo.start)} - ${formatDate(segment.gapInfo.end)} (${formatGapDuration(segment.gapInfo)})`
                  : undefined
              }
            >
              {segment.type === "gap" && segment.gapInfo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatGapDuration(segment.gapInfo)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline labels */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatDate(coverage_start)}</span>
        <span>{formatDate(coverage_end)}</span>
      </div>

      {/* Summary text */}
      <div className="text-xs text-gray-600">
        {summaryText}
      </div>

      {/* Legend */}
      {gap_count > 0 && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>Data available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-400 rounded" />
            <span>Gap</span>
          </div>
        </div>
      )}
    </div>
  );
}
