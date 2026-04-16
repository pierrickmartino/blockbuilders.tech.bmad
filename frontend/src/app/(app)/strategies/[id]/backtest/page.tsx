"use client";

import { type CSSProperties, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  BacktestListPage,
  BacktestStatus,
  BacktestStatusResponse,
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
import { WhatYouLearnedCard } from "@/components/WhatYouLearnedCard";
import { NarrativeCard } from "@/components/NarrativeCard";
import { LowTradeCountWarning } from "@/components/LowTradeCountWarning";
import { DataAvailabilitySection } from "@/components/DataAvailabilitySection";
import { ShareBacktestModal } from "@/components/ShareBacktestModal";
import { TransactionCostAnalysis } from "@/components/TransactionCostAnalysis";
import { trackBacktestView } from "@/lib/recent-views";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { AllRunsDrawer } from "@/components/AllRunsDrawer";
import { statusStyles } from "@/lib/backtest-constants";
import { BacktestPageHeader } from "@/components/backtest/PageHeader";
import { RunConfig } from "@/components/backtest/RunConfig";
import { KPIStrip } from "@/components/backtest/KPIStrip";
import { DrawdownSection } from "@/components/backtest/DrawdownSection";
import { PositionAnalysisCard } from "@/components/backtest/PositionAnalysisCard";
import { TradesSection } from "@/components/backtest/TradesSection";
import { DistributionRow } from "@/components/backtest/DistributionRow";
import { cn } from "@/lib/utils";

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


const SUMMARY_CARD_KEY = "bb.first_run_summary_card_seen";

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

type PeriodType = "month" | "quarter" | "weekday";

interface SeasonalityBucket {
  label: string;
  avgReturn: number;
  count: number;
}

interface SeasonalityYearRow {
  year: number;
  buckets: SeasonalityBucket[];
}

interface DistributionBucket {
  label: string;
  count: number;
  percentage: number; // 0-100
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"];
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SEASONALITY_PERCENT_FORMATTER = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  useGrouping: false,
});

function getSeasonalityLabels(periodType: PeriodType): string[] {
  return periodType === "month"
    ? MONTH_LABELS
    : periodType === "quarter"
      ? QUARTER_LABELS
      : WEEKDAY_LABELS;
}

function getSeasonalityBucketIndex(date: Date, periodType: PeriodType): number {
  if (periodType === "month") return date.getUTCMonth();
  if (periodType === "quarter") return Math.floor(date.getUTCMonth() / 3);
  return (date.getUTCDay() + 6) % 7;
}

function formatSeasonalityPercent(value: number): string {
  return `${value >= 0 ? "+" : "-"}${SEASONALITY_PERCENT_FORMATTER.format(Math.abs(value))}%`;
}

function getSeasonalityGridClass(periodType: PeriodType): string {
  if (periodType === "month") return "grid-cols-12 min-w-[720px]";
  if (periodType === "quarter") return "grid-cols-4 min-w-[360px]";
  return "grid-cols-7 min-w-[560px]";
}

function getSeasonalityCellStyle(
  avgReturn: number,
  count: number,
  scaleMax: number
): CSSProperties {
  if (count === 0) {
    return {
      backgroundColor: "rgba(148, 163, 184, 0.08)",
      borderColor: "rgba(148, 163, 184, 0.12)",
      color: "rgba(100, 116, 139, 0.7)",
    };
  }

  const intensity = Math.min(Math.abs(avgReturn) / Math.max(scaleMax, 0.01), 1);
  const easedIntensity = Math.pow(intensity, 0.8);
  const alpha = 0.14 + easedIntensity * 0.78;
  const isPositive = avgReturn >= 0;
  const base = isPositive ? "22, 163, 74" : "220, 38, 38";

  return {
    backgroundColor: `rgba(${base}, ${alpha})`,
    borderColor: `rgba(${base}, ${Math.min(alpha + 0.08, 1)})`,
    color: easedIntensity > 0.72 ? "#ffffff" : isPositive ? "#166534" : "#991b1b",
  };
}

function computeSeasonality(
  trades: Array<{ exit_time: string; pnl_pct: number }>,
  periodType: PeriodType
): SeasonalityYearRow[] {
  const bucketsByYear = new Map<number, Map<number, { sum: number; count: number }>>();
  const labels = getSeasonalityLabels(periodType);
  const numBuckets = labels.length;

  for (const trade of trades) {
    const date = new Date(trade.exit_time);
    if (Number.isNaN(date.getTime())) continue;

    const year = date.getUTCFullYear();
    const bucket = getSeasonalityBucketIndex(date, periodType);
    const yearBuckets = bucketsByYear.get(year) ?? new Map<number, { sum: number; count: number }>();
    const current = yearBuckets.get(bucket) ?? { sum: 0, count: 0 };

    yearBuckets.set(bucket, { sum: current.sum + trade.pnl_pct, count: current.count + 1 });
    bucketsByYear.set(year, yearBuckets);
  }

  return Array.from(bucketsByYear.entries())
    .sort(([leftYear], [rightYear]) => leftYear - rightYear)
    .map(([year, buckets]) => ({
      year,
      buckets: Array.from({ length: numBuckets }, (_, index) => {
        const data = buckets.get(index);
        return {
          label: labels[index],
          avgReturn: data ? data.sum / data.count : 0,
          count: data?.count ?? 0,
        };
      }),
    }));
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
  trades: Array<{ entry_time: string; exit_time: string }>
): DistributionBucket[] | null {
  const buckets = [
    { label: '<1h',   minSec: 0,       maxSec: 3600,    count: 0 },
    { label: '1–6h',  minSec: 3600,    maxSec: 21600,   count: 0 },
    { label: '6–24h', minSec: 21600,   maxSec: 86400,   count: 0 },
    { label: '1–3d',  minSec: 86400,   maxSec: 259200,  count: 0 },
    { label: '3–7d',  minSec: 259200,  maxSec: 604800,  count: 0 },
    { label: '7–14d', minSec: 604800,  maxSec: 1209600, count: 0 },
    { label: '>14d',  minSec: 1209600, maxSec: Infinity, count: 0 },
  ];

  let validCount = 0;

  for (const trade of trades) {
    try {
      const entryMs = new Date(trade.entry_time).getTime();
      const exitMs = new Date(trade.exit_time).getTime();

      if (isNaN(entryMs) || isNaN(exitMs)) continue;
      const holdSeconds = (exitMs - entryMs) / 1000;
      if (holdSeconds < 0) continue;

      for (const bucket of buckets) {
        if (holdSeconds >= bucket.minSec && holdSeconds < bucket.maxSec) {
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

function computeSkew(trades: Array<{ pnl_pct: number }>): number {
  const n = trades.length;
  if (n < 3) return 0;
  const values = trades.map(t => t.pnl_pct);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  const sum = values.reduce((a, b) => a + ((b - mean) / std) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sum;
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
  const { user } = useAuth();
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
  const [totalBacktests, setTotalBacktests] = useState<number | undefined>(undefined);
  const [isLoadingBacktests, setIsLoadingBacktests] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());

  // Pagination state for backtest runs list
  const [runsCurrentPage, setRunsCurrentPage] = useState(1);
  const runsPageSize = 5;

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

  // All runs drawer state
  const [showAllRunsDrawer, setShowAllRunsDrawer] = useState(false);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);

  // Seasonality state
  const [periodType, setPeriodType] = useState<PeriodType>("month");

  // Keyboard shortcuts modal state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const customFormRef = useRef<HTMLFormElement | null>(null);
  const runDetailsRef = useRef<HTMLElement | null>(null);

  // Summary card has its own key so scroll-based overlay dismissal doesn't hide it
  const [showSummaryCard, setShowSummaryCard] = useState(false);

  // Batch backtesting state
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(new Set());
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batchSkippedRuns, setBatchSkippedRuns] = useState<BatchRunResult[]>([]);
  const batchInitialized = useRef(false);

  const { isAllDone: isBatchDone } = useBatchBacktestResults(activeBatchId);

  useEffect(() => {
    if (!showSummaryCard) {
      setShowSummaryCard(Boolean(user?.has_completed_onboarding && !getSummaryCardSeen()));
    }
  }, [user?.has_completed_onboarding, selectedRunId, showSummaryCard]);

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
  const seasonalityRows = useMemo(
    () => computeSeasonality(trades, periodType),
    [trades, periodType]
  );

  const seasonalityScaleMax = 5;

  // Compute trade distribution data
  const returnDistribution = useMemo(() => {
    if (trades.length < 3) return [];
    return computeReturnDistribution(trades);
  }, [trades]);

  const durationDistribution = useMemo(() => {
    if (trades.length < 3) return null;
    return computeDurationDistribution(trades);
  }, [trades]);

  const durationDistributionTotal = useMemo(() => {
    if (!durationDistribution) return 0;
    return durationDistribution.reduce((sum, bucket) => sum + bucket.count, 0);
  }, [durationDistribution]);

  const skewCallout = useMemo(() => {
    if (trades.length < 3) return "";
    return computeSkewCallout(returnDistribution);
  }, [returnDistribution, trades.length]);

  const skew = useMemo(() => {
    if (trades.length < 3) return undefined;
    return Math.round(computeSkew(trades) * 100) / 100;
  }, [trades]);

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
      const data = await apiFetch<BacktestListPage>(`/backtests/?${params.toString()}`);
      setBacktests(data.items);
      setTotalBacktests(data.total);
      data.items.forEach((run) => {
        if (!prevRunStatusByIdRef.current.has(run.run_id)) {
          prevRunStatusByIdRef.current.set(run.run_id, run.status);
        }
      });
      setError(null);
      if (data.items.length > 0 && !selectedRunId) {
        setSelectedRunId(data.items[0].run_id);
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
    <div className="flex flex-col overflow-x-hidden">
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
          <div className="space-y-3">
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
                className="lg:w-[620px] lg:flex-shrink-0"
                backtests={backtests}
                batchSkippedRuns={batchSkippedRuns}
                isLoadingBacktests={isLoadingBacktests}
                onRefresh={loadBacktests}
                currentPage={runsCurrentPage}
                pageSize={runsPageSize}
                onPageChange={setRunsCurrentPage}
                onViewAll={() => setShowAllRunsDrawer(true)}
                selectedRunId={selectedRunId}
                onSelectRun={setSelectedRunId}
                selectedRunIds={selectedRunIds}
                onToggleRunSelection={handleSelectRun}
                onCompare={handleCompareClick}
                timezone={timezone}
                totalCount={totalBacktests}
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
              <Tabs
                value={periodType}
                onValueChange={(value) => setPeriodType(value as PeriodType)}
                className="overflow-hidden rounded border border-border bg-card"
              >
                <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-[15px] font-semibold">Seasonality</h2>
                    <p className="text-xs text-muted-foreground">Returns by calendar period</p>
                  </div>

                  <TabsList>
                    <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                    <TabsTrigger value="quarter" className="text-xs">Quarter</TabsTrigger>
                    <TabsTrigger value="weekday" className="text-xs">Weekday</TabsTrigger>
                  </TabsList>
                </div>

                <div className="px-6 py-6">
                  {trades.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No trades available.</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-5">
                        {seasonalityRows.map((row) => (
                          <div
                            key={row.year}
                            className="grid grid-cols-[40px_minmax(0,1fr)] items-center"
                          >
                            <div className="text-xs font-semibold text-muted-foreground">
                              {row.year}
                            </div>

                            <div className="overflow-x-auto pb-1">
                              <div className={cn("grid gap-1.5", getSeasonalityGridClass(periodType))}>
                                {row.buckets.map((bucket) => {
                                  const cellStyle = getSeasonalityCellStyle(
                                    bucket.avgReturn,
                                    bucket.count,
                                    seasonalityScaleMax
                                  );

                                  return (
                                    <div
                                      key={`${row.year}-${bucket.label}`}
                                      className={cn(
                                        "flex min-h-[52px] flex-col items-center justify-between rounded-lg border py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]",
                                        bucket.count === 0 && "shadow-none"
                                      )}
                                      style={cellStyle}
                                      title={
                                        bucket.count > 0
                                          ? `${row.year} ${bucket.label}: ${formatPercent(bucket.avgReturn)} average across ${bucket.count} trades`
                                          : `${row.year} ${bucket.label}: no trades`
                                      }
                                    >
                                      {bucket.count > 0 ? (
                                        <>
                                          <div className="text-[10px] font-medium text-center">{bucket.label}</div>
                                          <div className="text-xs font-semibold text-center">
                                            {formatSeasonalityPercent(bucket.avgReturn)}
                                          </div>
                                        </>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
                        <span>{`< -5%`}</span>
                        {[-1, -0.45, 0, 0.45, 1].map((multiplier, index) => (
                          <span
                            key={`${multiplier}-${index}`}
                            className="inline-block h-4 w-6 rounded border"
                            style={getSeasonalityCellStyle(multiplier * 5, multiplier === 0 ? 0 : 1, 5)}
                          />
                        ))}
                        <span>{`> +5%`}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Tabs>
            </div>

            {/* Distribution charts */}
            {trades.length >= 3 && (
              <DistributionRow
                returnDistribution={returnDistribution}
                durationDistribution={durationDistribution}
                totalTrades={trades.length}
                durationDistributionTotal={durationDistributionTotal}
                skewCallout={skewCallout}
                skew={skew}
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

      {/* All Runs Drawer */}
      <AllRunsDrawer
        open={showAllRunsDrawer}
        onClose={() => setShowAllRunsDrawer(false)}
        strategyId={id}
        timezone={timezone}
        selectedRunId={selectedRunId}
        onSelectRun={setSelectedRunId}
        selectedRunIds={selectedRunIds}
        onToggleRunSelection={handleSelectRun}
        onCompare={handleCompareClick}
      />

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
