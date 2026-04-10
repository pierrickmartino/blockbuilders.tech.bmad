"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import { DataCompletenessResponse, DataQualityMetrics } from "@/types/backtest";
import { DataCompletenessTimeline } from "./DataCompletenessTimeline";
import InfoIcon from "./InfoIcon";

const GAP_THRESHOLDS = { excellent: 2, good: 5 } as const;
const VOLUME_CONSISTENCY_THRESHOLD = 95;

const formatLocalDate = (value: string) => {
  // Accept either "YYYY-MM-DD" or a full ISO timestamp; parse as local date to avoid TZ drift.
  const ymd = value.slice(0, 10);
  const [year, month, day] = ymd.split("-").map(Number);
  if (!year || !month || !day) {
    return value;
  }
  return new Date(year, month - 1, day).toLocaleDateString();
};

interface DataAvailabilitySectionProps {
  completeness: DataCompletenessResponse | null;
  dataQuality: DataQualityMetrics | null;
  gapOverlap: Array<{ start: string; end: string }> | null;
  dateFrom: string;
  dateTo: string;
}

export function DataAvailabilitySection({
  completeness,
  dataQuality,
  gapOverlap,
  dateFrom,
  dateTo,
}: DataAvailabilitySectionProps) {
  const hasIssues = Boolean(dataQuality?.has_issues || (gapOverlap && gapOverlap.length > 0));
  // Auto-expand when issues exist so warnings aren't hidden behind a click.
  const [isExpanded, setIsExpanded] = useState(hasIssues);
  const [showAllGaps, setShowAllGaps] = useState(false);

  if (!completeness && !dataQuality) {
    return null;
  }

  const hasOverallData = completeness && completeness.coverage_start && completeness.coverage_end;
  const panelId = "data-availability-panel";

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-muted/50 sm:px-4"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Data Availability</h3>
          {hasIssues && !isExpanded && (
            <span className="inline-flex items-center gap-1 rounded bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
              <AlertTriangle aria-hidden="true" className="h-3 w-3" />
              Issues detected
            </span>
          )}
        </div>
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div id={panelId} className="space-y-4 border-t border-border px-3 py-3 sm:px-4">
          {/* Overall Coverage */}
          {hasOverallData && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h4 className="text-sm font-medium">Overall Data Coverage</h4>
                <InfoIcon
                  tooltip={{
                    short: "Shows the full range of available historical data in our database for this asset/timeframe.",
                    long: "This metric indicates data availability from the earliest to latest candle in our database. High coverage means we have most data points across the full time range, even if some candles are missing within that range.",
                    category: "metric",
                  }}
                  className="text-muted-foreground"
                />
              </div>
              <div className="mb-2 text-sm text-muted-foreground">
                <span className="data-text font-semibold">{completeness.completeness_percent.toFixed(1)}%</span> complete from{" "}
                <span className="data-text font-medium">{formatLocalDate(completeness.coverage_start!)}</span>{" "}
                to{" "}
                <span className="data-text font-medium">{formatLocalDate(completeness.coverage_end!)}</span>
              </div>
              {completeness && <DataCompletenessTimeline data={completeness} />}
            </div>
          )}

          {/* Selected Period Quality */}
          {dataQuality && (
            <div>
              <div className="mb-2">
                <h4 className="text-sm font-medium">Selected Period Quality</h4>
                <div className="data-text text-xs text-muted-foreground">
                  {formatLocalDate(dateFrom)} – {formatLocalDate(dateTo)}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {/* Missing Candles */}
                <div className="rounded border border-border bg-muted/30 p-2 sm:p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Missing Candles</span>
                    <InfoIcon
                      tooltip={{
                        short: "Percentage of expected candles that are missing in your selected backtest period.",
                        long: "This measures scattered missing data points within each day. For example, if we expect 24 hourly candles per day but only receive 20-21, that's ~12-16% missing. Missing candles can affect backtest accuracy.",
                        category: "metric",
                      }}
                      className="text-muted-foreground"
                    />
                  </div>
                  <div
                    className={`data-text flex items-center gap-1 text-base font-semibold sm:text-lg ${
                      dataQuality.gap_percent > GAP_THRESHOLDS.good ? "text-warning" : "text-foreground"
                    }`}
                  >
                    {dataQuality.gap_percent > GAP_THRESHOLDS.good && (
                      <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                    )}
                    {dataQuality.gap_percent.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dataQuality.gap_percent < GAP_THRESHOLDS.excellent
                      ? "Excellent"
                      : dataQuality.gap_percent < GAP_THRESHOLDS.good
                        ? "Good"
                        : "Poor"}
                  </div>
                </div>

                {/* Volume Consistency */}
                <div className="rounded border border-border bg-muted/30 p-2 sm:p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Volume Consistency</span>
                    <InfoIcon
                      tooltip={{
                        short: "Percentage of candles with valid volume data.",
                        long: "Shows how many candles have non-zero volume values. Low volume consistency may indicate data quality issues or periods of low market activity.",
                        category: "metric",
                      }}
                      className="text-muted-foreground"
                    />
                  </div>
                  <div
                    className={`data-text flex items-center gap-1 text-base font-semibold sm:text-lg ${
                      dataQuality.volume_consistency < VOLUME_CONSISTENCY_THRESHOLD
                        ? "text-warning"
                        : "text-foreground"
                    }`}
                  >
                    {dataQuality.volume_consistency < VOLUME_CONSISTENCY_THRESHOLD && (
                      <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                    )}
                    {dataQuality.volume_consistency.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dataQuality.volume_consistency >= VOLUME_CONSISTENCY_THRESHOLD ? "Excellent" : "Needs attention"}
                  </div>
                </div>

                {/* Outliers */}
                <div className="rounded border border-border bg-muted/30 p-2 sm:p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Price Outliers</span>
                    <InfoIcon
                      tooltip={{
                        short: "Number of candles with extreme price movements (>25%).",
                        long: "Counts candles where the price changed by more than 25% in a single period. These may indicate data errors or extreme market events.",
                        category: "metric",
                      }}
                      className="text-muted-foreground"
                    />
                  </div>
                  <div className="data-text text-base font-semibold text-foreground sm:text-lg">
                    {dataQuality.outlier_count}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dataQuality.outlier_count === 0 ? "None detected" : "Review advised"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Large Gaps */}
          {gapOverlap !== null && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h4 className="text-sm font-medium">Large Data Gaps</h4>
                <InfoIcon
                  tooltip={{
                    short: "Continuous periods of missing data larger than expected.",
                    long: "Unlike scattered missing candles, these are significant continuous gaps where no data exists for multiple hours or days. These can seriously impact backtest results.",
                    category: "metric",
                  }}
                  className="text-muted-foreground"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {gapOverlap.length === 0 ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    No large gaps in your selected period
                  </span>
                ) : (
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 font-medium text-warning">
                      <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                      {gapOverlap.length} large gap{gapOverlap.length > 1 ? "s" : ""} detected
                    </span>
                    {(showAllGaps ? gapOverlap : gapOverlap.slice(0, 3)).map((gap, idx) => (
                      <div key={idx} className="data-text ml-4 text-xs text-muted-foreground">
                        • {new Date(gap.start).toLocaleString()} – {new Date(gap.end).toLocaleString()}
                      </div>
                    ))}
                    {gapOverlap.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowAllGaps(!showAllGaps)}
                        className="ml-4 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {showAllGaps ? "Show fewer" : `Show all ${gapOverlap.length} gaps`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Overall Warning Summary */}
          {hasIssues && (
            <div className="rounded border border-warning/40 bg-warning/10 px-3 py-2">
              <div className="mb-1 flex items-center gap-1 text-sm font-medium text-warning">
                <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                Data Quality Warning
              </div>
              <div className="text-sm text-foreground">
                {dataQuality?.issues_description && (
                  <div className="mb-1">{dataQuality.issues_description}</div>
                )}
                {gapOverlap && gapOverlap.length > 0 && (
                  <div>
                    Your selected period overlaps {gapOverlap.length} large data gap
                    {gapOverlap.length > 1 ? "s" : ""}.
                  </div>
                )}
                <div className="mt-2 font-medium">Backtest results may be less reliable.</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
