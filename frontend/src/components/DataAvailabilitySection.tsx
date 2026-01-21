"use client";

import { useState } from "react";
import { DataCompletenessResponse, DataQualityMetrics } from "@/types/backtest";
import { DataCompletenessTimeline } from "./DataCompletenessTimeline";
import InfoIcon from "./InfoIcon";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const formatLocalDate = (ymd: string) => {
    const [year, month, day] = ymd.split("-").map(Number);
    if (!year || !month || !day) {
      return ymd;
    }
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  if (!completeness && !dataQuality) {
    return null;
  }

  const hasIssues = dataQuality?.has_issues || (gapOverlap && gapOverlap.length > 0);
  const hasOverallData = completeness && completeness.coverage_start && completeness.coverage_end;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-gray-50 sm:px-4"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900">Data Availability</h3>
          {hasIssues && !isExpanded && (
            <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
              ⚠️ Issues detected
            </span>
          )}
        </div>
        <svg
          className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="space-y-4 border-t border-gray-200 px-3 py-3 sm:px-4">
          {/* Overall Coverage */}
          {hasOverallData && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-700">Overall Data Coverage</h4>
                <InfoIcon
                  tooltip={{
                    short: "Shows the full range of available historical data in our database for this asset/timeframe.",
                    long: "This metric indicates data availability from the earliest to latest candle in our database. High coverage means we have most data points across the full time range, even if some candles are missing within that range.",
                    category: "metric",
                  }}
                  className="text-gray-400"
                />
              </div>
              <div className="mb-2 text-sm text-gray-600">
                <span className="font-semibold">{completeness.completeness_percent.toFixed(1)}%</span> complete from{" "}
                <span className="font-medium">
                  {new Date(completeness.coverage_start).toLocaleDateString()}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {new Date(completeness.coverage_end).toLocaleDateString()}
                </span>
              </div>
              {completeness && <DataCompletenessTimeline data={completeness} />}
            </div>
          )}

          {/* Selected Period Quality */}
          {dataQuality && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-700">
                  Selected Period Quality
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    ({formatLocalDate(dateFrom)} - {formatLocalDate(dateTo)})
                  </span>
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {/* Missing Candles */}
                <div className="rounded border border-gray-200 bg-gray-50 p-2 sm:p-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>Missing Candles</span>
                    <InfoIcon
                      tooltip={{
                        short: "Percentage of expected candles that are missing in your selected backtest period.",
                        long: "This measures scattered missing data points within each day. For example, if we expect 24 hourly candles per day but only receive 20-21, that's ~12-16% missing. Missing candles can affect backtest accuracy.",
                        category: "metric",
                      }}
                      className="text-gray-400"
                    />
                  </div>
                  <div
                    className={`text-base font-semibold sm:text-lg ${
                      dataQuality.gap_percent > 5 ? "text-yellow-700" : "text-gray-900"
                    }`}
                  >
                    {dataQuality.gap_percent.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {dataQuality.gap_percent < 2 ? "Excellent" : dataQuality.gap_percent < 5 ? "Good" : "Poor"}
                  </div>
                </div>

                {/* Volume Consistency */}
                <div className="rounded border border-gray-200 bg-gray-50 p-2 sm:p-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>Volume Consistency</span>
                    <InfoIcon
                      tooltip={{
                        short: "Percentage of candles with valid volume data.",
                        long: "Shows how many candles have non-zero volume values. Low volume consistency may indicate data quality issues or periods of low market activity.",
                        category: "metric",
                      }}
                      className="text-gray-400"
                    />
                  </div>
                  <div
                    className={`text-base font-semibold sm:text-lg ${
                      dataQuality.volume_consistency < 95 ? "text-yellow-700" : "text-gray-900"
                    }`}
                  >
                    {dataQuality.volume_consistency.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {dataQuality.volume_consistency >= 95 ? "Excellent" : "Needs attention"}
                  </div>
                </div>

                {/* Outliers */}
                <div className="rounded border border-gray-200 bg-gray-50 p-2 sm:p-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>Price Outliers</span>
                    <InfoIcon
                      tooltip={{
                        short: "Number of candles with extreme price movements (>25%).",
                        long: "Counts candles where the price changed by more than 25% in a single period. These may indicate data errors or extreme market events.",
                        category: "metric",
                      }}
                      className="text-gray-400"
                    />
                  </div>
                  <div className="text-base font-semibold text-gray-900 sm:text-lg">
                    {dataQuality.outlier_count}
                  </div>
                  <div className="text-xs text-gray-500">
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
                <h4 className="text-sm font-medium text-gray-700">Large Data Gaps</h4>
                <InfoIcon
                  tooltip={{
                    short: "Continuous periods of missing data larger than expected.",
                    long: "Unlike scattered missing candles, these are significant continuous gaps where no data exists for multiple hours or days. These can seriously impact backtest results.",
                    category: "metric",
                  }}
                  className="text-gray-400"
                />
              </div>
              <div className="text-sm text-gray-600">
                {gapOverlap.length === 0 ? (
                  <span className="text-green-600">✓ No large gaps in your selected period</span>
                ) : (
                  <div className="space-y-1">
                    <span className="font-medium text-orange-700">
                      ⚠️ {gapOverlap.length} large gap{gapOverlap.length > 1 ? "s" : ""} detected
                    </span>
                    {gapOverlap.slice(0, 3).map((gap, idx) => (
                      <div key={idx} className="ml-4 text-xs text-gray-600">
                        • {new Date(gap.start).toLocaleString()} - {new Date(gap.end).toLocaleString()}
                      </div>
                    ))}
                    {gapOverlap.length > 3 && (
                      <div className="ml-4 text-xs text-gray-500">
                        ... and {gapOverlap.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Overall Warning Summary */}
          {hasIssues && (
            <div className="rounded border border-yellow-200 bg-yellow-50 px-3 py-2">
              <div className="mb-1 text-sm font-medium text-yellow-800">⚠️ Data Quality Warning</div>
              <div className="text-sm text-yellow-700">
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
