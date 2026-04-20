"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime, formatRelativeTime, type TimezoneMode } from "@/lib/format";
import { Strategy, StrategyVersion } from "@/types/strategy";
import { BacktestStatus, BacktestStatusResponse, DataQualityMetrics } from "@/types/backtest";
import {
  exportMetricsToCSV,
  exportMetricsToJSON,
} from "@/lib/backtest-export";
import { StatusBadge } from "@/components/backtest/StatusBadge";
import { CalendarDays, Download, Play, Share2 } from "lucide-react";

const GAP_THRESHOLDS = { excellent: 2, good: 5 } as const;
const VOLUME_CONSISTENCY_THRESHOLD = 95;

function formatHeaderDate(value: string) {
  const ymd = value.slice(0, 10);
  const [year, month, day] = ymd.split("-").map(Number);
  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function getQualityIndicator(dataQuality: DataQualityMetrics | null) {
  if (!dataQuality) {
    return {
      dotClassName: "bg-muted-foreground/35",
      label: "Data quality pending",
    };
  }

  const hasPoorGaps = dataQuality.gap_percent >= GAP_THRESHOLDS.good;
  const hasWeakVolume = dataQuality.volume_consistency < VOLUME_CONSISTENCY_THRESHOLD;
  const hasOutliers = dataQuality.outlier_count > 0;

  if (hasPoorGaps || hasWeakVolume || hasOutliers) {
    return {
      dotClassName: "bg-warning",
      label: "Data quality needs attention",
    };
  }

  if (dataQuality.gap_percent >= GAP_THRESHOLDS.excellent) {
    return {
      dotClassName: "bg-amber-500",
      label: "Data quality is good",
    };
  }

  return {
    dotClassName: "bg-success",
    label: "Data quality is excellent",
  };
}

interface BacktestPageHeaderProps {
  strategy: Strategy;
  strategyVersion: StrategyVersion | null;
  selectedRun: BacktestStatusResponse | null;
  selectedRunId: string | null;
  dataQuality: DataQualityMetrics | null;
  displayedDateFrom: string;
  displayedDateTo: string;
  timezone: TimezoneMode;
  isZeroTradeNarrativeMode: boolean;
  onShare: () => void;
  onRunBacktest: () => void;
  isSubmitting: boolean;
  runStatus?: BacktestStatus | null;
  runRange?: string | null;
}

export function BacktestPageHeader({
  strategy,
  strategyVersion,
  selectedRun,
  selectedRunId,
  dataQuality,
  displayedDateFrom,
  displayedDateTo,
  timezone,
  isZeroTradeNarrativeMode,
  onShare,
  onRunBacktest,
  isSubmitting,
  runStatus = null,
  runRange = null,
}: BacktestPageHeaderProps) {
  const showActions =
    selectedRun?.status === "completed" &&
    selectedRun.summary &&
    !isZeroTradeNarrativeMode;
  const qualityIndicator = getQualityIndicator(dataQuality);
  const versionLabel = strategyVersion ? `v${strategyVersion.version_number}` : "Unsaved";
  const updatedLabel = strategyVersion?.created_at
    ? `Updated ${formatRelativeTime(strategyVersion.created_at)}`
    : "Not saved yet";

  return (
    <div className="border-b border-border bg-card px-4 py-5 sm:px-8 sm:py-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-3.5">
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.24em]">
              Live Strategy
            </span>
            <span className="hidden font-mono text-xs sm:inline">&middot;</span>
            <span className="font-mono text-xs">{versionLabel}</span>
            <span className="hidden font-mono text-xs sm:inline">&middot;</span>
            <time
              className="font-mono text-xs"
              dateTime={strategyVersion?.created_at ?? undefined}
              title={
                strategyVersion?.created_at
                  ? formatDateTime(strategyVersion.created_at, timezone)
                  : undefined
              }
            >
              {updatedLabel}
            </time>
          </div>

          <h1 className="text-2xl font-bold sm:text-[28px]">
            {strategy.name}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-2 rounded border border-border bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground"
              title={qualityIndicator.label}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${qualityIndicator.dotClassName}`} />
              {strategy.asset}
            </span>
            <span className="inline-flex items-center rounded border border-border bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground">
              {strategy.timeframe}
            </span>
            {runStatus && <StatusBadge status={runStatus} />}
            <span
              className="inline-flex items-center gap-2 rounded border border-border bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground"
              title={runRange ? "Backtested period" : "Data availability range"}
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {runRange
                ? runRange
                : `${formatHeaderDate(displayedDateFrom)} \u2192 ${formatHeaderDate(displayedDateTo)}`}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 xl:justify-end">
          {showActions && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onShare}
                className="gap-2"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() =>
                      exportMetricsToCSV(
                        selectedRun.summary!,
                        selectedRun,
                        selectedRunId!
                      )
                    }
                  >
                    Download CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      exportMetricsToJSON(
                        selectedRun.summary!,
                        selectedRun,
                        selectedRunId!
                      )
                    }
                  >
                    Download JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Button
            onClick={onRunBacktest}
            disabled={isSubmitting}
            className="gap-2"
            aria-label="Open run configuration"
          >
            <Play className="h-3.5 w-3.5" />
            {isSubmitting ? "Starting…" : "Run backtest"}
          </Button>
        </div>
      </div>
    </div>
  );
}
