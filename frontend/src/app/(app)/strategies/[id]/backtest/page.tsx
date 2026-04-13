"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { apiFetch, ApiError, fetchDataQuality, fetchDataCompleteness, fetchDataAvailability } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import {
  formatDateTime,
  formatPercent,
  formatPrice,
  formatChartDate,
} from "@/lib/format";
import { useDisplay } from "@/context/display";
import { useAuth } from "@/context/auth";
import { useBacktestResults } from "@/hooks/useBacktestResults";
import { useBatchBacktestResults } from "@/hooks/useBatchBacktestResults";
import { Strategy, StrategyVersion } from "@/types/strategy";
import {
  BacktestCreateResponse,
  BacktestListItem,
  BacktestStatus,
  BacktestStatusResponse,
  BacktestSummary,
  BatchBacktestCreateResponse,
  BatchRunResult,
  DataAvailabilityResponse,
  DataQualityMetrics,
  DataCompletenessResponse,
  TradeDetail,
} from "@/types/backtest";
import { PlanResponse, ProfileResponse } from "@/types/auth";
import { StrategyTabs } from "@/components/StrategyTabs";
import TradeDrawer from "@/components/TradeDrawer";
import InfoIcon from "@/components/InfoIcon";
import { WhatYouLearnedCard } from "@/components/WhatYouLearnedCard";
import { NarrativeCard } from "@/components/NarrativeCard";
import { LowTradeCountWarning } from "@/components/LowTradeCountWarning";
import { DataAvailabilitySection } from "@/components/DataAvailabilitySection";
import { ShareBacktestModal } from "@/components/ShareBacktestModal";
import { TransactionCostAnalysis } from "@/components/TransactionCostAnalysis";
import { metricToGlossaryId, getTooltip } from "@/lib/tooltip-content";
import {
  Tooltip as RadixTooltip,
  TooltipTrigger as RadixTooltipTrigger,
  TooltipContent as RadixTooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { trackBacktestView } from "@/lib/recent-views";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ZoomableChart } from "@/components/ZoomableChart";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  exportEquityToCSV,
  exportEquityToJSON,
} from "@/lib/backtest-export";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { isInputElement } from "@/lib/keyboard-shortcuts";
import { BacktestRunsList } from "@/components/BacktestRunsList";
import { statusStyles } from "@/lib/backtest-constants";
import { BacktestPageHeader } from "@/components/backtest/PageHeader";
import { RunConfig } from "@/components/backtest/RunConfig";
import { KPIStrip } from "@/components/backtest/KPIStrip";
import { DrawdownSection } from "@/components/backtest/DrawdownSection";
import { PositionAnalysisCard } from "@/components/backtest/PositionAnalysisCard";
import { TradesSection } from "@/components/backtest/TradesSection";
import { DistributionRow } from "@/components/backtest/DistributionRow";

interface Props {
  params: Promise<{ id: string }>;
}

const DEFAULT_LOOKBACK_DAYS = 180;

const formatDateInput = (date: Date) => date.toISOString().split("T")[0];

const defaultRange = (() => {
  const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - DEFAULT_LOOKBACK_DAYS);
  return { from: formatDateInput(past), to: formatDateInput(today) };
})();

type PeriodPreset = "30d" | "60d" | "90d" | "120d" | "1y" | "2y" | "3y" | "custom";

interface PeriodOption {
  value: PeriodPreset;
  label: string;
  days: number | null;
  premiumOnly: boolean;
}

const PERIOD_PRESETS: PeriodOption[] = [
  { value: "30d", label: "Last 30 days", days: 30, premiumOnly: false },
  { value: "60d", label: "Last 60 days", days: 60, premiumOnly: false },
  { value: "90d", label: "Last 90 days", days: 90, premiumOnly: false },
  { value: "120d", label: "Last 120 days", days: 120, premiumOnly: false },
  { value: "1y", label: "Last year", days: 365, premiumOnly: false },
  { value: "2y", label: "Last 2 years", days: 730, premiumOnly: true },
  { value: "3y", label: "Last 3 years", days: 1095, premiumOnly: true },
  { value: "custom", label: "Custom", days: null, premiumOnly: false },
];

/** Period presets available for batch selection (excludes "custom"). */
const BATCH_PERIOD_PRESETS = PERIOD_PRESETS.filter((p) => p.value !== "custom");



const FIRST_RUN_KEY = "bb.first_run_metric_explanations_seen";
const SUMMARY_CARD_KEY = "bb.first_run_summary_card_seen";
const FIRST_RUN_METRIC_KEYS = ["total-return", "max-drawdown", "win-rate", "trades", "benchmark-return"];
const DEFAULT_METRIC_KEYS = FIRST_RUN_METRIC_KEYS;

function getFirstRunSeen(): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(FIRST_RUN_KEY) === "true"; }
  catch { return true; }
}

function markFirstRunSeen(): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(FIRST_RUN_KEY, "true"); }
  catch { /* storage unavailable */ }
}

function getSummaryCardSeen(): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(SUMMARY_CARD_KEY) === "true"; }
  catch { return true; }
}

function markSummaryCardSeen(): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SUMMARY_CARD_KEY, "true"); }
  catch { /* storage unavailable */ }
}

interface MetricConfig {
  key: string;
  label: string;
  getValue: (summary: BacktestSummary) => string | number;
}

function getOrderedMetrics(
  summary: BacktestSummary,
  favoriteKeys: string[] | null
): MetricConfig[] {
  const allMetrics: MetricConfig[] = [
    { key: "final-balance", label: "Final balance", getValue: s => formatPrice(s.final_balance) },
    { key: "total-return", label: "Total return", getValue: s => formatPercent(s.total_return_pct) },
    { key: "max-drawdown", label: "Max drawdown", getValue: s => formatPercent(s.max_drawdown_pct) },
    { key: "cagr", label: "CAGR", getValue: s => formatPercent(s.cagr_pct) },
    { key: "trades", label: "Trades", getValue: s => s.num_trades },
    { key: "win-rate", label: "Win rate", getValue: s => formatPercent(s.win_rate_pct) },
    { key: "benchmark-return", label: "Benchmark return", getValue: s => formatPercent(s.benchmark_return_pct) },
    { key: "alpha", label: "Alpha", getValue: s => formatPercent(s.alpha) },
    { key: "beta", label: "Beta", getValue: s => s.beta.toFixed(2) },
    { key: "sharpe-ratio", label: "Sharpe ratio", getValue: s => s.sharpe_ratio.toFixed(2) },
    { key: "sortino-ratio", label: "Sortino ratio", getValue: s => s.sortino_ratio.toFixed(2) },
    { key: "calmar-ratio", label: "Calmar ratio", getValue: s => s.calmar_ratio.toFixed(2) },
    { key: "max-consec-losses", label: "Max consec. losses", getValue: s => s.max_consecutive_losses },
  ];

  if (!favoriteKeys || favoriteKeys.length === 0) {
    return allMetrics;
  }

  // Pinned metrics first (in user order), then remaining
  const pinned = favoriteKeys
    .map(key => allMetrics.find(m => m.key === key))
    .filter(Boolean) as MetricConfig[];

  const remaining = allMetrics.filter(m => !favoriteKeys.includes(m.key));

  return [...pinned, ...remaining];
}

function MetricCard({
  metricKey,
  label,
  value,
  isPinned = false,
  canMoveLeft = false,
  canMoveRight = false,
  onTogglePin,
  onMoveLeft,
  onMoveRight,
  disabled = false,
  firstRunExplanation,
  showFirstRunHelper = false,
}: {
  metricKey: string;
  label: string;
  value: string | number;
  isPinned?: boolean;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  onTogglePin?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  disabled?: boolean;
  firstRunExplanation?: string;
  showFirstRunHelper?: boolean;
}) {
  const tooltip = getTooltip(metricToGlossaryId(metricKey));

  return (
    <div className="rounded-lg border bg-secondary/50 p-2 dark:bg-secondary/30 sm:p-3">
      <div className="flex items-center justify-between gap-1 text-xs uppercase text-muted-foreground">
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate" title={tooltip?.short}>{label}</span>
          {showFirstRunHelper && tooltip?.firstRun ? (
            <TooltipProvider delayDuration={0}>
              <RadixTooltip>
                <RadixTooltipTrigger asChild>
                  <button
                    className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border text-[10px] leading-none text-muted-foreground transition-colors hover:text-primary"
                    aria-label="Explain metric"
                  >
                    ?
                  </button>
                </RadixTooltipTrigger>
                <RadixTooltipContent side="top" className="max-w-[220px] text-xs">
                  {tooltip.firstRun}
                </RadixTooltipContent>
              </RadixTooltip>
            </TooltipProvider>
          ) : (
            <InfoIcon tooltip={tooltip} className="hidden flex-shrink-0 sm:inline-flex" />
          )}
        </div>

        <button
          onClick={onTogglePin}
          disabled={disabled}
          aria-label={isPinned ? `Unpin ${label}` : `Pin ${label}`}
          aria-pressed={isPinned}
          className="flex-shrink-0 text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
          title={isPinned ? "Unpin metric" : "Pin metric"}
        >
          <svg className="h-4 w-4" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeWidth="2" d="M5 5l7-2 7 2v10l-7 2-7-2V5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="data-text text-2xl font-bold sm:text-3xl">{value}</div>

      {firstRunExplanation && (
        <p className="mt-1 text-xs text-muted-foreground/70">{firstRunExplanation}</p>
      )}

      {isPinned && (
        <div className="mt-2 flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onMoveLeft}
            disabled={!canMoveLeft || disabled}
            className="h-6 px-2 text-xs"
          >
            ← Left
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onMoveRight}
            disabled={!canMoveRight || disabled}
            className="h-6 px-2 text-xs"
          >
            Right →
          </Button>
        </div>
      )}
    </div>
  );
}

type PeriodType = "month" | "quarter" | "weekday";

interface SeasonalityBucket {
  label: string;
  avgReturn: number;
  count: number;
}

interface DistributionBucket {
  label: string;
  count: number;
  percentage: number; // 0-100
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"];
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getColorClass(avgReturn: number): string {
  if (avgReturn > 2) return "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800";
  if (avgReturn > 0.5) return "bg-green-50 text-green-600 border-green-100 dark:bg-green-950/50 dark:text-green-400 dark:border-green-900";
  if (avgReturn > -0.5) return "bg-secondary/50 text-muted-foreground border-border";
  if (avgReturn > -2) return "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900";
  return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800";
}

function computeSeasonality(
  trades: Array<{ exit_time: string; pnl_pct: number }>,
  periodType: PeriodType
): SeasonalityBucket[] {
  const buckets = new Map<number, { sum: number; count: number }>();
  const numBuckets = periodType === "month" ? 12 : periodType === "quarter" ? 4 : 7;

  for (const trade of trades) {
    const date = new Date(trade.exit_time);
    let bucket: number;

    if (periodType === "month") {
      bucket = date.getUTCMonth();
    } else if (periodType === "quarter") {
      bucket = Math.floor(date.getUTCMonth() / 3);
    } else {
      bucket = (date.getUTCDay() + 6) % 7;
    }

    const current = buckets.get(bucket) || { sum: 0, count: 0 };
    buckets.set(bucket, { sum: current.sum + trade.pnl_pct, count: current.count + 1 });
  }

  const labels = periodType === "month" ? MONTH_LABELS : periodType === "quarter" ? QUARTER_LABELS : WEEKDAY_LABELS;
  const result: SeasonalityBucket[] = [];

  for (let i = 0; i < numBuckets; i++) {
    const data = buckets.get(i);
    result.push({
      label: labels[i],
      avgReturn: data ? data.sum / data.count : 0,
      count: data?.count || 0,
    });
  }

  return result;
}

function timeframeToSeconds(timeframe: string): number {
  const match = timeframe.match(/^(\d+)([mhdw])$/);
  if (!match) return 86400; // default to 1 day

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    case 'w': return value * 604800;
    default: return 86400;
  }
}

interface PositionStats {
  avgHoldSeconds: number;
  avgHoldBars: number;
  longestHoldSeconds: number;
  longestHoldBars: number;
  shortestHoldSeconds: number;
  shortestHoldBars: number;
  avgPositionSize: number;
  hasMissingTimestamps: boolean;
  hasMissingPositionData: boolean;
}

function computePositionStats(
  trades: TradeDetail[],
  timeframeSeconds: number
): PositionStats | null {
  if (trades.length < 2) {
    return null;
  }

  let totalDuration = 0;
  let minDuration = Infinity;
  let maxDuration = -Infinity;
  let totalPositionSize = 0;
  let validDurationCount = 0;
  let validPositionCount = 0;
  let hasMissingTimestamps = false;
  let hasMissingPositionData = false;

  for (const trade of trades) {
    // Check hold time data
    if (trade.duration_seconds != null && trade.duration_seconds >= 0) {
      totalDuration += trade.duration_seconds;
      minDuration = Math.min(minDuration, trade.duration_seconds);
      maxDuration = Math.max(maxDuration, trade.duration_seconds);
      validDurationCount++;
    } else {
      hasMissingTimestamps = true;
    }

    // Check position size data
    if (
      trade.entry_price != null &&
      trade.qty != null &&
      trade.entry_price > 0 &&
      trade.qty > 0
    ) {
      totalPositionSize += trade.entry_price * trade.qty;
      validPositionCount++;
    } else {
      hasMissingPositionData = true;
    }
  }

  const avgHoldSeconds =
    validDurationCount > 0 ? totalDuration / validDurationCount : 0;

  return {
    avgHoldSeconds,
    avgHoldBars: avgHoldSeconds / timeframeSeconds,
    longestHoldSeconds: maxDuration !== -Infinity ? maxDuration : 0,
    longestHoldBars:
      (maxDuration !== -Infinity ? maxDuration : 0) / timeframeSeconds,
    shortestHoldSeconds: minDuration !== Infinity ? minDuration : 0,
    shortestHoldBars:
      (minDuration !== Infinity ? minDuration : 0) / timeframeSeconds,
    avgPositionSize:
      validPositionCount > 0 ? totalPositionSize / validPositionCount : 0,
    hasMissingTimestamps,
    hasMissingPositionData,
  };
}

function computeReturnDistribution(
  trades: Array<{ pnl_pct: number }>
): DistributionBucket[] {
  const buckets = [
    { label: '>20%', count: 0 },
    { label: '10-20%', count: 0 },
    { label: '5-10%', count: 0 },
    { label: '0-5%', count: 0 },
    { label: '0 to -5%', count: 0 },
    { label: '-5 to -10%', count: 0 },
    { label: '-10 to -20%', count: 0 },
    { label: '<-20%', count: 0 },
  ];

  for (const trade of trades) {
    const pnl = trade.pnl_pct;
    if (pnl > 20) {
      buckets[0].count++;
    } else if (pnl > 10) {
      buckets[1].count++;
    } else if (pnl > 5) {
      buckets[2].count++;
    } else if (pnl >= 0) {
      buckets[3].count++;
    } else if (pnl >= -5) {
      buckets[4].count++;
    } else if (pnl >= -10) {
      buckets[5].count++;
    } else if (pnl >= -20) {
      buckets[6].count++;
    } else {
      buckets[7].count++;
    }
  }

  const total = trades.length;
  return buckets.map(b => ({
    label: b.label,
    count: b.count,
    percentage: total > 0 ? (b.count / total) * 100 : 0,
  }));
}

function computeDurationDistribution(
  trades: Array<{ entry_time: string; exit_time: string }>,
  timeframeSeconds: number
): DistributionBucket[] | null {
  const buckets = [
    { label: '1', min: 0, max: 2, count: 0 },
    { label: '2-3', min: 2, max: 4, count: 0 },
    { label: '4-7', min: 4, max: 8, count: 0 },
    { label: '8-14', min: 8, max: 15, count: 0 },
    { label: '15-30', min: 15, max: 31, count: 0 },
    { label: '>30', min: 31, max: Infinity, count: 0 },
  ];

  let validCount = 0;

  for (const trade of trades) {
    try {
      const entryMs = new Date(trade.entry_time).getTime();
      const exitMs = new Date(trade.exit_time).getTime();

      if (isNaN(entryMs) || isNaN(exitMs)) continue;
      const durationSeconds = (exitMs - entryMs) / 1000;
      if (durationSeconds < 0) continue;
      const durationBars = Math.round(durationSeconds / timeframeSeconds);

      for (const bucket of buckets) {
        if (durationBars >= bucket.min && durationBars < bucket.max) {
          bucket.count++;
          validCount++;
          break;
        }
      }
    } catch {
      continue;
    }
  }

  if (validCount === 0) return null;

  const total = validCount;
  return buckets.map(b => ({
    label: b.label,
    count: b.count,
    percentage: total > 0 ? (b.count / total) * 100 : 0,
  }));
}

function computeSkewCallout(returnBuckets: DistributionBucket[]): string {
  // Find largest win bucket (indices 0-3 are wins, 4-7 are losses)
  const winBuckets = returnBuckets.slice(0, 4);
  const lossBuckets = returnBuckets.slice(4, 8);

  const largestWinBucket = winBuckets.reduce((max, b) =>
    b.count > max.count ? b : max, winBuckets[0]
  );

  const largestLossBucket = lossBuckets.reduce((max, b) =>
    b.count > max.count ? b : max, lossBuckets[0]
  );

  // Check if largest win is 0-5% AND largest loss is -10% or worse
  const isSmallWinBucket = largestWinBucket.label === '0-5%';
  const isLargeLossBucket = ['<-20%', '-10 to -20%'].includes(largestLossBucket.label);

  if (isSmallWinBucket && isLargeLossBucket) {
    return "Distribution skews to small wins and larger losses. Review risk controls.";
  }

  return "Distribution looks balanced across buckets.";
}

export default function StrategyBacktestPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { timezone } = useDisplay();
  const { user, refreshUser } = useAuth();
  const isMobile = useIsMobile();

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [strategyVersion, setStrategyVersion] = useState<StrategyVersion | null>(null);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [, setPeriodPreset] = useState<PeriodPreset>("custom");
  const [feeRate, setFeeRate] = useState("");
  const [slippageRate, setSlippageRate] = useState("");
  const [forceRefreshPrices, setForceRefreshPrices] = useState(false);
  const [isBetaGrandfatheredUser, setIsBetaGrandfatheredUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userPlan, setUserPlan] = useState<PlanResponse | null>(null);

  const [backtests, setBacktests] = useState<BacktestListItem[]>([]);
  const [isLoadingBacktests, setIsLoadingBacktests] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());

  // Pagination state for backtest runs list
  const [runsCurrentPage, setRunsCurrentPage] = useState(1);
  const runsPageSize = 8;

  // Pagination state for trades table
  const [tradesCurrentPage, setTradesCurrentPage] = useState(1);
  const [tradesPageSize, setTradesPageSize] = useState(25);

  // Data quality state
  const [dataQuality, setDataQuality] = useState<DataQualityMetrics | null>(null);

  // Data completeness state
  const [completeness, setCompleteness] = useState<DataCompletenessResponse | null>(null);

  // Data availability state
  const [dataAvailability, setDataAvailability] = useState<DataAvailabilityResponse | null>(null);
  const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(null);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);

  // Trade drawer state
  const [selectedTradeIdx, setSelectedTradeIdx] = useState<number | null>(null);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);

  // Seasonality state
  const [periodType, setPeriodType] = useState<PeriodType>("month");

  // Favorite metrics state
  const [savingMetrics, setSavingMetrics] = useState(false);

  // Keyboard shortcuts modal state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // First-run metric explanations state
  const [showFirstRunExplanations, setShowFirstRunExplanations] = useState(false);
  const firstRunEventFired = useRef(false);
  const firstRunResultsRef = useRef<HTMLDivElement | null>(null);
  const customFormRef = useRef<HTMLFormElement | null>(null);
  const runDetailsRef = useRef<HTMLElement | null>(null);

  // Summary card has its own key so scroll-based overlay dismissal doesn't hide it
  const [showSummaryCard, setShowSummaryCard] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const hasFavoriteMetrics = (user?.favorite_metrics?.length ?? 0) > 0;

  // Batch backtesting state
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(new Set());
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batchSkippedRuns, setBatchSkippedRuns] = useState<BatchRunResult[]>([]);
  const batchInitialized = useRef(false);

  const { isAllDone: isBatchDone } = useBatchBacktestResults(activeBatchId);

  useEffect(() => {
    const isFirstRun = Boolean(user?.has_completed_onboarding && !getFirstRunSeen());
    setShowFirstRunExplanations(isFirstRun);
    if (!showSummaryCard) {
      setShowSummaryCard(Boolean(user?.has_completed_onboarding && !getSummaryCardSeen()));
    }
  }, [user?.has_completed_onboarding, selectedRunId, showSummaryCard]);

  useEffect(() => {
    // Detailed metrics should always start collapsed when the active run changes.
    setShowDetailedAnalysis(false);
  }, [selectedRunId]);

  useEffect(() => {
    // Returning to default metric mode (no favorites) should reset to collapsed.
    if (!hasFavoriteMetrics) {
      setShowDetailedAnalysis(false);
    }
  }, [hasFavoriteMetrics]);

  const hasVisibleFirstRunMetrics = useCallback(() => {
    if (typeof window === "undefined") return false;
    const container = firstRunResultsRef.current;
    if (!container) return false;
    return container.querySelector('[data-first-run-metrics="true"]') !== null;
  }, []);

  const handleFirstRunInteraction = useCallback(() => {
    if (!showFirstRunExplanations || firstRunEventFired.current || !hasVisibleFirstRunMetrics()) return;
    firstRunEventFired.current = true;
    trackEvent("first_run_overlay_completed", undefined, user?.id);
    markFirstRunSeen();
    setShowFirstRunExplanations(false);
  }, [hasVisibleFirstRunMetrics, showFirstRunExplanations, user?.id]);

  useEffect(() => {
    if (!showFirstRunExplanations || firstRunEventFired.current) return;

    const handleScrollCompletion = () => {
      if (firstRunEventFired.current || !hasVisibleFirstRunMetrics()) return;
      const container = firstRunResultsRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (rect.bottom <= window.innerHeight) {
        handleFirstRunInteraction();
      }
    };

    window.addEventListener("scroll", handleScrollCompletion, { capture: true, passive: true });
    return () => {
      window.removeEventListener("scroll", handleScrollCompletion, { capture: true });
    };
  }, [handleFirstRunInteraction, hasVisibleFirstRunMetrics, showFirstRunExplanations]);

  // Use custom hook for backtest results (trades, equity curve, benchmark, polling)
  const prevRunStatusByIdRef = useRef<Map<string, BacktestStatus>>(new Map());
  const userIdRef = useRef(user?.id);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);

  const handleRunDetailFetched = useCallback((detail: BacktestStatusResponse) => {
    setError(null);
    setBacktests((current) =>
      current.map((run) =>
        run.run_id === detail.run_id
          ? {
              ...run,
              status: detail.status,
              total_return: detail.summary?.total_return_pct ?? run.total_return,
            }
          : run
      )
    );

    const previousStatus = prevRunStatusByIdRef.current.get(detail.run_id);
    if (
      detail.status === "completed" &&
      previousStatus !== undefined &&
      previousStatus !== "completed"
    ) {
      trackEvent("backtest_completed", {
        strategy_id: id,
        run_id: detail.run_id,
        total_return_pct: detail.summary?.total_return_pct,
        num_trades: detail.summary?.num_trades,
      }, userIdRef.current);
    }
    prevRunStatusByIdRef.current.set(detail.run_id, detail.status);
  }, [id]);

  // Favorite metrics handlers
  const handleToggleFavorite = useCallback(async (metricKey: string) => {
    if (!user) return;

    const current = user.favorite_metrics || [];
    const newFavorites = current.includes(metricKey)
      ? current.filter(k => k !== metricKey)
      : [...current, metricKey];

    setSavingMetrics(true);
    try {
      await apiFetch("/users/me", {
        method: "PUT",
        body: JSON.stringify({ favorite_metrics: newFavorites }),
      });
      await refreshUser();
    } catch {
      setError("Couldn't save your pinned metrics. Please try again.");
    } finally {
      setSavingMetrics(false);
    }
  }, [user, refreshUser]);

  const handleReorderFavorite = useCallback(async (metricKey: string, direction: "left" | "right") => {
    if (!user?.favorite_metrics) return;

    const current = [...user.favorite_metrics];
    const idx = current.indexOf(metricKey);
    if (idx === -1) return;

    const newIdx = direction === "left" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= current.length) return;

    // Swap
    [current[idx], current[newIdx]] = [current[newIdx], current[idx]];

    setSavingMetrics(true);
    try {
      await apiFetch("/users/me", {
        method: "PUT",
        body: JSON.stringify({ favorite_metrics: current }),
      });
      await refreshUser();
    } catch {
      setError("Couldn't reorder metrics. Please try again.");
    } finally {
      setSavingMetrics(false);
    }
  }, [user, refreshUser]);

  // Comparison selection handlers
  const handleSelectRun = useCallback((runId: string, checked: boolean) => {
    setSelectedRunIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(runId);
      else next.delete(runId);
      return next;
    });
  }, []);

  const handleCompareClick = useCallback(() => {
    const ids = Array.from(selectedRunIds);
    router.push(`/strategies/${id}/backtest/compare?runs=${ids.join(',')}`);
  }, [selectedRunIds, id, router]);

  const {
    selectedRun,
    trades,
    equityCurve,
    benchmarkCurve,
    isLoadingTrades,
    isLoadingEquityCurve,
    tradesError,
    equityCurveError,
    refetchTrades,
    refetchEquityCurve,
  } = useBacktestResults(selectedRunId, handleRunDetailFetched);

  // Compute seasonality data
  const seasonalityData = useMemo(
    () => computeSeasonality(trades, periodType),
    [trades, periodType]
  );

  // Compute trade distribution data
  const returnDistribution = useMemo(() => {
    if (trades.length < 3) return [];
    return computeReturnDistribution(trades);
  }, [trades]);

  const durationDistribution = useMemo(() => {
    if (trades.length < 3 || !selectedRun?.timeframe) return null;
    const timeframeSeconds = timeframeToSeconds(selectedRun.timeframe);
    return computeDurationDistribution(trades, timeframeSeconds);
  }, [trades, selectedRun?.timeframe]);

  const durationDistributionTotal = useMemo(() => {
    if (!durationDistribution) return 0;
    return durationDistribution.reduce((sum, bucket) => sum + bucket.count, 0);
  }, [durationDistribution]);

  const skewCallout = useMemo(() => {
    if (trades.length < 3) return "";
    return computeSkewCallout(returnDistribution);
  }, [returnDistribution, trades.length]);

  // Reset pagination when run changes
  useEffect(() => {
    if (selectedRun?.status === "completed") {
      setTradesCurrentPage(1);
    }
  }, [selectedRun?.status]);

  const loadStrategy = useCallback(async () => {
    setIsLoadingStrategy(true);
    try {
      const [data, versions] = await Promise.all([
        apiFetch<Strategy>(`/strategies/${id}`),
        apiFetch<StrategyVersion[]>(`/strategies/${id}/versions`).catch(() => null),
      ]);
      setStrategy(data);
      setStrategyVersion(versions?.[0] ?? null);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        router.push("/strategies");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load strategy");
    } finally {
      setIsLoadingStrategy(false);
    }
  }, [id, router]);

  const loadBacktests = useCallback(async () => {
    setIsLoadingBacktests(true);
    try {
      const offset = (runsCurrentPage - 1) * runsPageSize;
      const params = new URLSearchParams({
        strategy_id: id,
        limit: runsPageSize.toString(),
        offset: offset.toString(),
      });
      const data = await apiFetch<BacktestListItem[]>(`/backtests/?${params.toString()}`);
      setBacktests(data);
      data.forEach((run) => {
        if (!prevRunStatusByIdRef.current.has(run.run_id)) {
          prevRunStatusByIdRef.current.set(run.run_id, run.status);
        }
      });
      setError(null);
      if (data.length > 0 && !selectedRunId) {
        setSelectedRunId(data[0].run_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load backtests");
    } finally {
      setIsLoadingBacktests(false);
    }
  }, [id, runsCurrentPage, selectedRunId]);

  // Auto-refresh history when batch completes so batch runs appear in the list
  useEffect(() => {
    if (isBatchDone && activeBatchId) {
      setRunsCurrentPage(1);
      loadBacktests();
    }
  }, [isBatchDone, activeBatchId, loadBacktests]);

  // Auto-poll when any visible run is pending/running
  const hasActiveRuns = backtests.some(
    (r) => r.status === "pending" || r.status === "running"
  );

  useEffect(() => {
    if (!hasActiveRuns) return;
    const timer = setInterval(loadBacktests, 5000);
    return () => clearInterval(timer);
  }, [hasActiveRuns, loadBacktests]);

  useEffect(() => {
    loadStrategy();
    loadBacktests();
  }, [loadStrategy, loadBacktests]);

  // Track backtest view for recently viewed section
  useEffect(() => {
    if (selectedRunId && strategy) {
      trackBacktestView(id, selectedRunId);
    }
  }, [id, selectedRunId, strategy]);

  // Track results_viewed analytics event
  const trackedResultsRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      selectedRun?.status === "completed" &&
      selectedRunId &&
      trackedResultsRef.current !== selectedRunId
    ) {
      trackedResultsRef.current = selectedRunId;
      trackEvent("results_viewed", { strategy_id: id, run_id: selectedRunId }, user?.id);
    }
  }, [selectedRun?.status, selectedRunId, id, user?.id]);

  // Fetch user plan to check for premium features
  useEffect(() => {
    apiFetch<ProfileResponse>("/users/me")
      .then((data) => {
        setUserPlan(data.plan);
        setIsBetaGrandfatheredUser(data.settings.user_tier === "beta");
      })
      .catch(() => {
        setUserPlan(null);
        setIsBetaGrandfatheredUser(false);
        setError("Couldn't load your plan. Some period options may be unavailable — please refresh.");
      });
  }, []);

  // Check if user can use premium periods
  const isPremiumUser = userPlan?.tier === "premium" || userPlan?.tier === "pro";

  // Initialize batch period selection once plan info is loaded
  useEffect(() => {
    if (batchInitialized.current || userPlan === null) return;
    batchInitialized.current = true;
    const defaults = BATCH_PERIOD_PRESETS
      .filter((p) => !p.premiumOnly || isPremiumUser)
      .map((p) => p.value);
    setSelectedPeriods(new Set(defaults));
  }, [userPlan, isPremiumUser]);

  // Fetch data quality metrics when dates or strategy change
  useEffect(() => {
    if (!strategy || !dateFrom || !dateTo) {
      setDataQuality(null);
      return;
    }

    fetchDataQuality(strategy.asset, strategy.timeframe, dateFrom, dateTo)
      .then((data) => setDataQuality(data as DataQualityMetrics))
      .catch(() => setDataQuality(null));
  }, [strategy, dateFrom, dateTo]);

  // Fetch data completeness metrics when strategy loads
  useEffect(() => {
    if (!strategy) {
      setCompleteness(null);
      return;
    }

    fetchDataCompleteness(strategy.asset, strategy.timeframe)
      .then((data) => setCompleteness(data as DataCompletenessResponse))
      .catch(() => setCompleteness(null));
  }, [strategy]);

  // Fetch data availability when strategy loads
  useEffect(() => {
    if (!strategy) {
      setDataAvailability(null);
      return;
    }

    fetchDataAvailability(strategy.asset, strategy.timeframe)
      .then((data) => setDataAvailability(data as DataAvailabilityResponse))
      .catch(() => setDataAvailability(null));
  }, [strategy]);

  // Handle dateFrom before earliest available date
  // Beta users: warn but allow override (triggers data download)
  // Regular users: auto-adjust to earliest available date
  useEffect(() => {
    if (!dataAvailability?.earliest_date || !dateFrom) return;
    if (dateFrom < dataAvailability.earliest_date) {
      if (isBetaGrandfatheredUser) {
        setAvailabilityWarning(
          `Data for ${dataAvailability.asset} starts at ${dataAvailability.earliest_date}. Running this backtest will download earlier data and may take longer.`
        );
      } else {
        setAvailabilityWarning(
          `Data for ${dataAvailability.asset} starts at ${dataAvailability.earliest_date}. Your backtest will use the available range.`
        );
        setDateFrom(dataAvailability.earliest_date);
        setPeriodPreset("custom");
      }
    } else {
      setAvailabilityWarning(null);
    }
  }, [dateFrom, dataAvailability, isBetaGrandfatheredUser]);

  // Detect if backtest period overlaps any gaps
  const gapOverlap = useMemo(() => {
    if (!completeness || !dateFrom || !dateTo) return null;
    const start = new Date(`${dateFrom}T00:00:00Z`);
    const end = new Date(`${dateTo}T23:59:59Z`);
    return completeness.gap_ranges.filter(gap => {
      const gapStart = new Date(gap.start);
      const gapEnd = new Date(gap.end);
      return start < gapEnd && end > gapStart;
    });
  }, [completeness, dateFrom, dateTo]);

  const submitBacktest = async () => {
    if (!dateFrom || !dateTo) return;
    const fromDate = new Date(`${dateFrom}T00:00:00Z`);
    const toDate = new Date(`${dateTo}T23:59:59Z`);

    const payload: Record<string, unknown> = {
      strategy_id: id,
      date_from: fromDate.toISOString(),
      date_to: toDate.toISOString(),
    };

    if (isBetaGrandfatheredUser && forceRefreshPrices) {
      payload.force_refresh_prices = true;
    }

    if (feeRate) payload.fee_rate = Number(feeRate);
    if (slippageRate) payload.slippage_rate = Number(slippageRate);

    setIsSubmitting(true);
    try {
      const res = await apiFetch<BacktestCreateResponse>("/backtests/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      trackEvent("backtest_started", {
        strategy_id: id,
        run_id: res.run_id,
        date_from: dateFrom,
        date_to: dateTo,
      }, user?.id);
      setStatusMessage("Backtest started. It will update automatically when finished.");
      setSelectedRunId(res.run_id);
      await loadBacktests();
      runDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start backtest");
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleTogglePeriod = useCallback((period: string, checked: boolean) => {
    setSelectedPeriods((prev) => {
      const next = new Set(prev);
      if (checked) next.add(period);
      else next.delete(period);
      return next;
    });
  }, []);

  const submitBatchBacktest = async () => {
    if (selectedPeriods.size === 0) return;
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);
    setActiveBatchId(null);
    setBatchSkippedRuns([]);

    const payload: Record<string, unknown> = {
      strategy_id: id,
      periods: Array.from(selectedPeriods),
    };
    if (feeRate) payload.fee_rate = Number(feeRate);
    if (slippageRate) payload.slippage_rate = Number(slippageRate);

    try {
      const res = await apiFetch<BatchBacktestCreateResponse>("/backtests/batch", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      trackEvent("batch_backtest_started", {
        strategy_id: id,
        batch_id: res.batch_id,
        periods: Array.from(selectedPeriods),
        period_count: selectedPeriods.size,
      }, user?.id);
      setActiveBatchId(res.batch_id);
      setBatchSkippedRuns(res.runs.filter((r) => r.status === "skipped"));
      const queuedCount = res.runs.filter((r) => r.status === "pending").length;
      setStatusMessage(`Batch started: ${queuedCount} backtest${queuedCount !== 1 ? "s" : ""} queued. Results will appear below as they complete.`);
      await loadBacktests();
      runDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start batch backtest");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (isInputElement(target)) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Run backtest: Cmd/Ctrl+Enter (standard "submit" shortcut)
      if (isMod && key === "enter") {
        if (isSubmitting) return;
        e.preventDefault();
        const form = customFormRef.current;
        if (form) {
          form.dispatchEvent(
            new Event("submit", { cancelable: true, bubbles: true })
          );
        } else {
          setStatusMessage("Open custom dates to run a single backtest, or use Run All.");
        }
        return;
      }

      // Show shortcuts: ?
      if (key === "?" && !isMod) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting]);

  const statusBadge = useCallback((status: BacktestStatus) => {
    const cls = statusStyles[status];
    return (
      <span className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium capitalize ${cls}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
        {status}
      </span>
    );
  }, []);

  const selectedRunRange = useMemo(() => {
    if (!selectedRun) return null;
    return `${formatDateTime(selectedRun.date_from, timezone).split(" ")[0]} → ${formatDateTime(selectedRun.date_to, timezone).split(" ")[0]}`;
  }, [selectedRun, timezone]);

  const isZeroTradeRun =
    selectedRun?.status === "completed" &&
    selectedRun?.summary?.num_trades === 0;

  const isZeroTradeNarrativeMode =
    isZeroTradeRun && Boolean(selectedRun?.narrative);

  // Merge equity curve and benchmark for chart
  const chartData = useMemo(() => {
    if (equityCurve.length === 0) return [];

    const benchmarkMap = new Map(
      benchmarkCurve.map((b) => [b.timestamp, b.equity])
    );

    return equityCurve.map((point) => ({
      timestamp: point.timestamp,
      equity: point.equity,
      benchmark: benchmarkMap.get(point.timestamp) || null,
    }));
  }, [equityCurve, benchmarkCurve]);

  // Calculate drawdown data for drawdown chart
  const drawdownData = useMemo(() => {
    if (equityCurve.length < 2) return [];

    let peak = equityCurve[0].equity;
    let maxDrawdown = 0;
    let maxDrawdownStartIdx = 0;
    let maxDrawdownEndIdx = 0;
    let currentDrawdownStartIdx = 0;

    // First pass: calculate drawdowns and find max drawdown period
    const points = equityCurve.map((point, idx) => {
      if (point.equity > peak) {
        peak = point.equity;
        currentDrawdownStartIdx = idx;
      }

      // Guard against division by zero
      const drawdown = peak > 0 ? ((point.equity - peak) / peak) * 100 : 0;

      // Track max drawdown
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownStartIdx = currentDrawdownStartIdx;
        maxDrawdownEndIdx = idx;
      }

      return {
        timestamp: point.timestamp,
        drawdown,
        equity: point.equity,
        peak,
      };
    });

    // Second pass: find recovery point (when equity returns to peak after max drawdown)
    let recovered = false;
    for (let i = maxDrawdownEndIdx + 1; i < points.length; i++) {
      if (points[i].equity >= points[maxDrawdownEndIdx].peak) {
        maxDrawdownEndIdx = i;
        recovered = true;
        break;
      }
    }
    if (!recovered) {
      maxDrawdownEndIdx = points.length - 1;
    }

    // Mark max drawdown period
    return points.map((point, idx) => ({
      timestamp: point.timestamp,
      drawdown: point.drawdown,
      isMaxDrawdown: idx >= maxDrawdownStartIdx && idx <= maxDrawdownEndIdx,
    }));
  }, [equityCurve]);

  // Responsive tick configuration for mobile
  const tickConfig = useMemo(() => {
    if (isMobile) {
      return {
        xAxisTicks: 3, // Only 3 date labels on mobile
        yAxisTicks: 4, // Only 4 value labels on mobile
      };
    }
    return {
      xAxisTicks: undefined, // Auto on desktop
      yAxisTicks: undefined,
    };
  }, [isMobile]);

  // Compute position stats for KPI strip
  const positionStatsForKPI = useMemo(() => {
    if (!selectedRun?.timeframe || trades.length < 2) return null;
    const tfs = timeframeToSeconds(selectedRun.timeframe);
    return computePositionStats(trades, tfs);
  }, [trades, selectedRun?.timeframe]);

  if (isLoadingStrategy) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading strategy...</div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Strategy not found</p>
          <Link href="/strategies" className="mt-4 text-primary/80 transition-colors hover:text-primary hover:underline">
            Back to strategies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-x-hidden">
      {/* Alerts */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start justify-between gap-2 border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive sm:px-8"
        >
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss error" className="flex-shrink-0 text-destructive/70 hover:text-destructive">×</button>
        </div>
      )}
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start justify-between gap-2 border-b border-green-200 bg-green-50 px-4 py-2 text-sm text-green-600 dark:border-green-800 dark:bg-green-950 dark:text-green-400 sm:px-8"
        >
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} aria-label="Dismiss message" className="flex-shrink-0 opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      {/* Tab Bar */}
      <StrategyTabs strategyId={id} activeTab="backtest" />

      {/* Page Header */}
      <BacktestPageHeader
        strategy={strategy}
        strategyVersion={strategyVersion}
        selectedRun={selectedRun ?? null}
        selectedRunId={selectedRunId}
        dataQuality={dataQuality}
        displayedDateFrom={dataAvailability?.earliest_date ?? dateFrom}
        displayedDateTo={dataAvailability?.latest_date ?? dateTo}
        timezone={timezone}
        isZeroTradeNarrativeMode={isZeroTradeNarrativeMode}
        onShare={() => setShowShareModal(true)}
        onRunBacktest={submitBatchBacktest}
        isSubmitting={isSubmitting}
        selectedPeriodCount={selectedPeriods.size}
      />

      {/* Main Content */}
      <div className="flex-1 space-y-5 overflow-auto bg-secondary p-4 dark:bg-background sm:px-8 sm:py-7">
        {/* Data Availability */}
        <DataAvailabilitySection
          dataAvailability={dataAvailability}
          completeness={completeness}
          dataQuality={dataQuality}
          gapOverlap={gapOverlap}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />

        {/* Run Configuration */}
        <RunConfig
          periods={BATCH_PERIOD_PRESETS}
          selectedPeriods={selectedPeriods}
          onTogglePeriod={handleTogglePeriod}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(v) => { setAvailabilityWarning(null); setDateFrom(v); setPeriodPreset("custom"); }}
          onDateToChange={(v) => { setDateTo(v); setPeriodPreset("custom"); }}
          feeRate={feeRate}
          slippageRate={slippageRate}
          onFeeRateChange={setFeeRate}
          onSlippageRateChange={setSlippageRate}
          isPremiumUser={isPremiumUser}
          isBetaGrandfatheredUser={isBetaGrandfatheredUser}
          forceRefreshPrices={forceRefreshPrices}
          onForceRefreshChange={setForceRefreshPrices}
          availabilityWarning={availabilityWarning}
        />

        {/* Run status messages */}
        {selectedRun && (
          <div ref={firstRunResultsRef} className="space-y-3" onClick={handleFirstRunInteraction}>
            {/* Status badge + range */}
            <div className="flex items-center gap-3">
              {statusBadge(selectedRun.status)}
              {selectedRunRange && (
                <span className="font-mono text-xs text-muted-foreground">{selectedRunRange}</span>
              )}
            </div>

            {/* Narrative */}
            {selectedRun.narrative && (
              <NarrativeCard
                narrative={selectedRun.narrative}
                strategyId={id}
                isZeroTradeRun={!!isZeroTradeRun}
                userId={user?.id}
              />
            )}

            {/* Low trade count */}
            <LowTradeCountWarning
              numTrades={selectedRun.summary?.num_trades}
              runId={selectedRunId!}
              userId={user?.id}
            />

            {/* Failed run */}
            {selectedRun.status === "failed" && (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
              >
                <span>{selectedRun.error_message || "Backtest failed. Please try again."}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedRun.date_from && selectedRun.date_to) {
                      setDateFrom(selectedRun.date_from.split("T")[0]);
                      setDateTo(selectedRun.date_to.split("T")[0]);
                      setPeriodPreset("custom");
                    }
                    submitBacktest();
                  }}
                  disabled={isSubmitting}
                >
                  Retry with same parameters
                </Button>
              </div>
            )}

            {/* Pending/running status */}
            {selectedRun.status !== "completed" && selectedRun.status !== "failed" && (
              <p className="text-sm text-muted-foreground">
                Backtest is {selectedRun.status}. We&apos;ll keep polling for results.
              </p>
            )}
          </div>
        )}

        {!selectedRunId && (
          <p className="text-sm text-muted-foreground">Select a run to see details, or run a new backtest.</p>
        )}

        {/* Results — only for completed runs, hidden in zero-trade narrative mode */}
        {selectedRun?.status === "completed" && !isZeroTradeNarrativeMode && selectedRun.summary && (
          <>
            {/* KPI Strip */}
            <KPIStrip
              summary={selectedRun.summary}
              trades={trades}
              positionStats={positionStatsForKPI}
            />

            {/* Detailed metrics toggle */}
            {(() => {
              const orderedMetrics = getOrderedMetrics(selectedRun.summary!, user?.favorite_metrics || null);
              const primaryKeys = hasFavoriteMetrics ? user!.favorite_metrics! : DEFAULT_METRIC_KEYS;
              const detailedMetrics = orderedMetrics.filter(m => !primaryKeys.includes(m.key));

              if (detailedMetrics.length === 0) return null;

              return (
                <div className="space-y-3" data-first-run-metrics="true">
                  <button
                    type="button"
                    onClick={() => setShowDetailedAnalysis(prev => !prev)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <svg
                      className={`h-4 w-4 transition-transform ${showDetailedAnalysis ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {showDetailedAnalysis ? "Hide detailed analysis" : "Show detailed analysis"}
                  </button>
                  {showDetailedAnalysis && (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                      {detailedMetrics.map((metric) => {
                        const isPinned = user?.favorite_metrics?.includes(metric.key) || false;
                        const pinnedMetrics = user?.favorite_metrics || [];
                        const pinnedIndex = pinnedMetrics.indexOf(metric.key);
                        const isFirstRunMetric = FIRST_RUN_METRIC_KEYS.includes(metric.key);
                        const metricTooltip = getTooltip(metricToGlossaryId(metric.key));

                        return (
                          <MetricCard
                            key={metric.key}
                            metricKey={metric.key}
                            label={metric.label}
                            value={metric.getValue(selectedRun.summary!)}
                            isPinned={isPinned}
                            canMoveLeft={isPinned && pinnedIndex > 0}
                            canMoveRight={isPinned && pinnedIndex < pinnedMetrics.length - 1}
                            onTogglePin={() => handleToggleFavorite(metric.key)}
                            onMoveLeft={() => handleReorderFavorite(metric.key, "left")}
                            onMoveRight={() => handleReorderFavorite(metric.key, "right")}
                            disabled={savingMetrics}
                            firstRunExplanation={showFirstRunExplanations && isFirstRunMetric ? metricTooltip?.firstRun : undefined}
                            showFirstRunHelper={!showFirstRunExplanations && isFirstRunMetric && !!metricTooltip?.firstRun}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* What You Learned — first-run only */}
            {showSummaryCard &&
              selectedRun.summary.benchmark_return_pct != null && (
                <WhatYouLearnedCard
                  strategyReturnPct={selectedRun.summary.total_return_pct}
                  benchmarkReturnPct={selectedRun.summary.benchmark_return_pct}
                  asset={selectedRun.asset}
                  dateRange={selectedRunRange || "the test period"}
                  onDismiss={() => {
                    markSummaryCardSeen();
                    setShowSummaryCard(false);
                  }}
                />
              )}

            {/* Charts + Runs side by side */}
            <div className="flex flex-col gap-5 lg:flex-row">
              {/* Equity Curve Card */}
              <div className="min-w-0 flex-1 rounded border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
                  <div className="space-y-1">
                    <h2 className="text-[15px] font-semibold">Equity curve</h2>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-0.5 w-4 rounded bg-primary" />
                        Strategy
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-0.5 w-4 rounded border-b border-dashed border-muted-foreground" />
                        Buy &amp; Hold
                      </span>
                    </div>
                  </div>
                  {equityCurve.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs">Export</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => exportEquityToCSV(equityCurve, selectedRunId!)}>CSV</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportEquityToJSON(equityCurve, selectedRunId!)}>JSON</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="px-4 py-5 sm:px-5">
                  {isLoadingEquityCurve ? (
                    <div className="flex h-56 items-center justify-center">
                      <p className="text-sm text-muted-foreground">Loading equity curve...</p>
                    </div>
                  ) : equityCurveError ? (
                    <div className="flex h-56 items-center justify-center rounded border border-destructive/30 bg-destructive/5">
                      <div className="text-center">
                        <p className="text-sm text-destructive">{equityCurveError}</p>
                        <Button variant="link" size="sm" onClick={refetchEquityCurve} className="mt-2">Retry</Button>
                      </div>
                    </div>
                  ) : equityCurve.length === 0 ? (
                    <div className="flex h-56 items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">No equity data available.</p>
                        <Button variant="link" size="sm" onClick={refetchEquityCurve} className="mt-2">Retry</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-56 sm:h-64">
                      <ZoomableChart>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <XAxis
                              dataKey="timestamp"
                              tickFormatter={(v) => formatChartDate(v, timezone)}
                              tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                              tickLine={false}
                              axisLine={{ stroke: "hsl(var(--border))" }}
                              tickCount={tickConfig.xAxisTicks}
                            />
                            <YAxis
                              tickFormatter={(v) => formatPrice(v, "").trim()}
                              tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                              tickLine={false}
                              axisLine={{ stroke: "hsl(var(--border))" }}
                              width={65}
                              tickCount={tickConfig.yAxisTicks}
                            />
                            <Tooltip
                              formatter={(value) => [formatPrice(Number(value)), "Equity"]}
                              labelFormatter={(label) => formatDateTime(label as string, timezone)}
                              contentStyle={{
                                backgroundColor: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "0.25rem",
                                fontSize: "0.75rem",
                                color: "hsl(var(--popover-foreground))",
                              }}
                            />
                            <Line type="monotone" dataKey="equity" stroke="hsl(var(--chart-1))" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: "hsl(var(--chart-1))" }} name="Strategy" />
                            <Line type="monotone" dataKey="benchmark" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} strokeDasharray="5 5" name="Buy & Hold" />
                          </LineChart>
                        </ResponsiveContainer>
                      </ZoomableChart>
                    </div>
                  )}
                </div>
              </div>

              {/* Runs list side panel */}
              <BacktestRunsList
                className="lg:w-[420px] lg:flex-shrink-0"
                backtests={backtests}
                batchSkippedRuns={batchSkippedRuns}
                isLoadingBacktests={isLoadingBacktests}
                onRefresh={loadBacktests}
                currentPage={runsCurrentPage}
                pageSize={runsPageSize}
                onPageChange={setRunsCurrentPage}
                selectedRunId={selectedRunId}
                onSelectRun={setSelectedRunId}
                selectedRunIds={selectedRunIds}
                onToggleRunSelection={handleSelectRun}
                onCompare={handleCompareClick}
                timezone={timezone}
              />
            </div>

            {/* Drawdown */}
            <DrawdownSection
              drawdownData={drawdownData}
              summary={selectedRun.summary}
              isLoading={isLoadingEquityCurve}
              error={equityCurveError}
              onRetry={refetchEquityCurve}
              timezone={timezone}
              tickConfig={tickConfig}
            />

            {/* Position + Seasonality */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <PositionAnalysisCard trades={trades} timeframe={selectedRun.timeframe} />

              {/* Seasonality (inline — kept in page) */}
              <div className="rounded border border-border bg-card">
                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <h2 className="text-[15px] font-semibold">Seasonality</h2>
                  <p className="text-xs text-muted-foreground">Return distribution by period</p>
                </div>
                <div className="px-4 py-5 sm:px-5">
                  {trades.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No trades available.</p>
                  ) : (
                    <Tabs value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
                      <TabsList className="rounded-md bg-secondary p-0.5">
                        <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                        <TabsTrigger value="quarter" className="text-xs">Quarter</TabsTrigger>
                        <TabsTrigger value="weekday" className="text-xs">Weekday</TabsTrigger>
                      </TabsList>
                      <TabsContent value={periodType} className="mt-4">
                        <div
                          className={`grid gap-1.5 ${
                            periodType === "month"
                              ? "grid-cols-4 sm:grid-cols-6"
                              : periodType === "quarter"
                              ? "grid-cols-2 sm:grid-cols-4"
                              : "grid-cols-4 sm:grid-cols-7"
                          }`}
                        >
                          {seasonalityData.map((bucket, idx) => {
                            const arrow = bucket.count === 0 ? "" : bucket.avgReturn > 0.5 ? "▲ " : bucket.avgReturn < -0.5 ? "▼ " : "";
                            return (
                              <div
                                key={idx}
                                className={`rounded border p-1.5 text-center sm:p-2 ${getColorClass(bucket.avgReturn)}`}
                                title={`${bucket.label}: ${formatPercent(bucket.avgReturn)} avg, ${bucket.count} trades`}
                              >
                                <div className="text-[10px] font-medium">{bucket.label}</div>
                                <div className="font-mono text-[10px] font-semibold sm:text-xs">
                                  {bucket.count > 0 ? `${arrow}${formatPercent(bucket.avgReturn)}` : "—"}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                          <span>Legend:</span>
                          <span className="inline-flex items-center gap-1">
                            <span className="inline-block h-2.5 w-2.5 rounded border bg-red-100 dark:bg-red-950" />
                            ▼ Worse
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="inline-block h-2.5 w-2.5 rounded border bg-secondary/50" />
                            Neutral
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="inline-block h-2.5 w-2.5 rounded border bg-green-100 dark:bg-green-950" />
                            ▲ Better
                          </span>
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                </div>
              </div>
            </div>

            {/* Distribution charts */}
            {trades.length >= 3 && (
              <DistributionRow
                returnDistribution={returnDistribution}
                durationDistribution={durationDistribution}
                totalTrades={trades.length}
                durationDistributionTotal={durationDistributionTotal}
                skewCallout={skewCallout}
              />
            )}

            {/* Trades table */}
            {!isLoadingTrades && !tradesError && (
              <TradesSection
                trades={trades}
                selectedRunId={selectedRunId!}
                timezone={timezone}
                onSelectTrade={setSelectedTradeIdx}
                tradesCurrentPage={tradesCurrentPage}
                tradesPageSize={tradesPageSize}
                onPageChange={setTradesCurrentPage}
                onPageSizeChange={setTradesPageSize}
              />
            )}

            {isLoadingTrades && (
              <div className="rounded border border-border bg-card px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">Loading trades...</p>
              </div>
            )}

            {tradesError && (
              <div className="flex items-center gap-2 rounded border border-border bg-card px-4 py-4">
                <p className="text-sm text-destructive">{tradesError}</p>
                <Button variant="link" size="sm" onClick={refetchTrades} className="h-auto p-0">Retry</Button>
              </div>
            )}

            {/* Transaction Cost Analysis */}
            <TransactionCostAnalysis summary={selectedRun.summary} />
          </>
        )}
      </div>

      {/* Trade Details Drawer */}
      {selectedTradeIdx !== null && selectedRunId && selectedRun && (
        <TradeDrawer
          runId={selectedRunId}
          tradeIdx={selectedTradeIdx}
          asset={selectedRun.asset}
          timeframe={selectedRun.timeframe}
          onClose={() => setSelectedTradeIdx(null)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={showShortcutsModal}
        onOpenChange={setShowShortcutsModal}
      />

      {/* Share Backtest Modal */}
      {selectedRunId && selectedRun?.status === "completed" && (
        <ShareBacktestModal
          open={showShareModal}
          onOpenChange={setShowShareModal}
          runId={selectedRunId}
        />
      )}

      {/* Download confirmation dialog */}
      <Dialog open={showDownloadConfirm} onOpenChange={setShowDownloadConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download earlier data?</DialogTitle>
            <DialogDescription>
              Data for {dataAvailability?.asset} currently starts at{" "}
              {dataAvailability?.earliest_date}. Your selected start date ({dateFrom}) is
              before the available range.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The missing historical data will be downloaded automatically. This backtest may
            take longer than usual while data is fetched.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDownloadConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowDownloadConfirm(false);
                submitBacktest();
              }}
            >
              Download &amp; run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
