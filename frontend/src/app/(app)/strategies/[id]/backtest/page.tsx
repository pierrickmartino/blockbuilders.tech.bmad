"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { apiFetch, ApiError, fetchDataQuality, fetchDataCompleteness } from "@/lib/api";
import {
  formatDateTime,
  formatPercent,
  formatPrice,
  formatMoney,
  formatChartDate,
  formatDuration,
} from "@/lib/format";
import { useDisplay } from "@/context/display";
import { useAuth } from "@/context/auth";
import { useBacktestResults } from "@/hooks/useBacktestResults";
import { Strategy } from "@/types/strategy";
import {
  BacktestCreateResponse,
  BacktestListItem,
  BacktestStatus,
  BacktestStatusResponse,
  BacktestSummary,
  DataQualityMetrics,
  DataCompletenessResponse,
  TradeDetail,
} from "@/types/backtest";
import { PlanResponse } from "@/types/auth";
import { StrategyTabs } from "@/components/StrategyTabs";
import TradeDrawer from "@/components/TradeDrawer";
import InfoIcon from "@/components/InfoIcon";
import { DataCompletenessTimeline } from "@/components/DataCompletenessTimeline";
import { BacktestSentimentStrip } from "@/components/BacktestSentimentStrip";
import { metricToGlossaryId, getTooltip } from "@/lib/tooltip-content";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ZoomableChart } from "@/components/ZoomableChart";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  exportTradesToCSV,
  exportTradesToJSON,
  exportEquityToCSV,
  exportEquityToJSON,
  exportMetricsToCSV,
  exportMetricsToJSON,
} from "@/lib/backtest-export";

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

type PeriodPreset = "30d" | "60d" | "90d" | "1y" | "2y" | "3y" | "custom";

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
  { value: "1y", label: "Last year", days: 365, premiumOnly: false },
  { value: "2y", label: "Last 2 years", days: 730, premiumOnly: true },
  { value: "3y", label: "Last 3 years", days: 1095, premiumOnly: true },
  { value: "custom", label: "Custom", days: null, premiumOnly: false },
];

function getDatesFromPreset(preset: PeriodPreset): { from: string; to: string } | null {
  const option = PERIOD_PRESETS.find((p) => p.value === preset);
  if (!option || option.days === null) return null;
  const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - option.days);
  return { from: formatDateInput(past), to: formatDateInput(today) };
}

const statusStyles: Record<BacktestStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

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
}) {
  const tooltip = getTooltip(metricToGlossaryId(metricKey));

  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-2 sm:p-3">
      <div className="flex items-center justify-between gap-1 text-xs uppercase text-gray-500">
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate" title={tooltip?.short}>{label}</span>
          <InfoIcon tooltip={tooltip} className="hidden flex-shrink-0 sm:inline-flex" />
        </div>

        <button
          onClick={onTogglePin}
          disabled={disabled}
          className="flex-shrink-0 text-gray-400 transition-colors hover:text-blue-500 disabled:opacity-50"
          title={isPinned ? "Unpin metric" : "Pin metric"}
        >
          <svg className="h-4 w-4" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" d="M5 5l7-2 7 2v10l-7 2-7-2V5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="text-base font-semibold text-gray-900 sm:text-lg">{value}</div>

      {isPinned && (
        <div className="mt-2 hidden gap-1 sm:flex">
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
  if (avgReturn > 2) return "bg-green-100 text-green-700 border-green-200";
  if (avgReturn > 0.5) return "bg-green-50 text-green-600 border-green-100";
  if (avgReturn > -0.5) return "bg-gray-50 text-gray-600 border-gray-200";
  if (avgReturn > -2) return "bg-red-50 text-red-600 border-red-100";
  return "bg-red-100 text-red-700 border-red-200";
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

function getHoldTimeInterpretation(avgHoldSeconds: number): string {
  const oneDaySeconds = 86400;
  if (avgHoldSeconds <= oneDaySeconds) {
    return 'Holding times suggest a day-trading style.';
  }
  return 'Holding times suggest a swing-trading style.';
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
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("custom");
  const [feeRate, setFeeRate] = useState("");
  const [slippageRate, setSlippageRate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userPlan, setUserPlan] = useState<PlanResponse | null>(null);

  const [backtests, setBacktests] = useState<BacktestListItem[]>([]);
  const [isLoadingBacktests, setIsLoadingBacktests] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Data quality state
  const [dataQuality, setDataQuality] = useState<DataQualityMetrics | null>(null);

  // Data completeness state
  const [completeness, setCompleteness] = useState<DataCompletenessResponse | null>(null);

  // Trade drawer state
  const [selectedTradeIdx, setSelectedTradeIdx] = useState<number | null>(null);

  // Seasonality state
  const [periodType, setPeriodType] = useState<PeriodType>("month");

  // Favorite metrics state
  const [savingMetrics, setSavingMetrics] = useState(false);

  // Use custom hook for backtest results (trades, equity curve, benchmark, polling)
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
  }, []);

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
      // Silent fail or show toast
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
      // Silent fail
    } finally {
      setSavingMetrics(false);
    }
  }, [user, refreshUser]);

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
      setCurrentPage(1);
    }
  }, [selectedRun?.status]);

  const loadStrategy = useCallback(async () => {
    setIsLoadingStrategy(true);
    try {
      const data = await apiFetch<Strategy>(`/strategies/${id}`);
      setStrategy(data);
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
      const params = new URLSearchParams({ strategy_id: id });
      const data = await apiFetch<BacktestListItem[]>(`/backtests/?${params.toString()}`);
      setBacktests(data);
      setError(null);
      if (data.length > 0) {
        setSelectedRunId((current) => current ?? data[0].run_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load backtests");
    } finally {
      setIsLoadingBacktests(false);
    }
  }, [id]);

  useEffect(() => {
    loadStrategy();
    loadBacktests();
  }, [loadStrategy, loadBacktests]);

  // Fetch user plan to check for premium features
  useEffect(() => {
    apiFetch<{ plan: PlanResponse }>("/users/me")
      .then((data) => setUserPlan(data.plan))
      .catch(() => setUserPlan(null));
  }, []);

  // Handle period preset changes
  const handlePeriodChange = useCallback((preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const dates = getDatesFromPreset(preset);
    if (dates) {
      setDateFrom(dates.from);
      setDateTo(dates.to);
    }
  }, []);

  // Check if user can use premium periods
  const isPremiumUser = userPlan?.tier === "premium" || userPlan?.tier === "pro";

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage(null);
    setError(null);

    if (!dateFrom || !dateTo) {
      setError("Please select a start and end date.");
      return;
    }

    const fromDate = new Date(`${dateFrom}T00:00:00Z`);
    const toDate = new Date(`${dateTo}T23:59:59Z`);

    if (fromDate >= toDate) {
      setError("End date must be after start date.");
      return;
    }

    const payload: Record<string, unknown> = {
      strategy_id: id,
      date_from: fromDate.toISOString(),
      date_to: toDate.toISOString(),
    };

    if (feeRate) payload.fee_rate = Number(feeRate);
    if (slippageRate) payload.slippage_rate = Number(slippageRate);

    setIsSubmitting(true);
    try {
      const res = await apiFetch<BacktestCreateResponse>("/backtests/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setStatusMessage("Backtest started. It will update automatically when finished.");
      setSelectedRunId(res.run_id);
      await loadBacktests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start backtest");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadge = useCallback((status: BacktestStatus) => {
    const cls = statusStyles[status];
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
        {status}
      </span>
    );
  }, []);

  const selectedRunRange = useMemo(() => {
    if (!selectedRun) return null;
    return `${formatDateTime(selectedRun.date_from, timezone).split(" ")[0]} → ${formatDateTime(selectedRun.date_to, timezone).split(" ")[0]}`;
  }, [selectedRun, timezone]);

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

  // Trades pagination
  const totalPages = Math.ceil(trades.length / pageSize);
  const paginatedTrades = trades.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (isLoadingStrategy) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading strategy...</div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Strategy not found</p>
          <Link href="/strategies" className="mt-4 text-blue-600 hover:text-blue-800">
            Back to strategies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-x-hidden">
      {/* Top Bar */}
      <div className="border-b bg-white px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/strategies" className="text-gray-500 hover:text-gray-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">{strategy.name}</h1>
            <span className="hidden rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 sm:inline">
              {strategy.asset}
            </span>
            <span className="hidden rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 sm:inline">
              {strategy.timeframe}
            </span>
          </div>
          <p className="text-sm text-gray-600">Run a backtest on the latest saved version of this strategy.</p>
        </div>

        <StrategyTabs strategyId={id} activeTab="backtest" />

        {error && (
          <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
        {statusMessage && (
          <div className="mt-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-600">
            {statusMessage}
          </div>
        )}
        {dataQuality?.has_issues && (
          <div className="mt-2 rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
            ⚠️ Data quality warning: {dataQuality.issues_description}. Results may be less reliable.
          </div>
        )}
        {gapOverlap && gapOverlap.length > 0 && (
          <div className="mt-2 rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
            ⚠️ Warning: Selected period overlaps {gapOverlap.length} data gap{gapOverlap.length > 1 ? 's' : ''}. Results may be affected by missing data.
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4 overflow-auto bg-gray-50 p-3 sm:p-4">
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-3 sm:mb-4">
              <h2 className="text-base font-semibold text-gray-900">Run a backtest</h2>
              <p className="text-sm text-gray-500">
                Uses the latest saved version. Fee and slippage default to your settings.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Period</label>
                <Select value={periodPreset} onValueChange={(v) => handlePeriodChange(v as PeriodPreset)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_PRESETS.map((option) => {
                      const isDisabled = option.premiumOnly && !isPremiumUser;
                      return (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          disabled={isDisabled}
                        >
                          {option.label}
                          {option.premiumOnly && (
                            <span className={`ml-2 text-xs ${isDisabled ? "text-gray-400" : "text-amber-600"}`}>
                              (Pro/Premium)
                            </span>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date from</label>
                <Input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPeriodPreset("custom");
                  }}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date to</label>
                <Input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPeriodPreset("custom");
                  }}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fee rate (optional)</label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="0.1"
                  value={feeRate}
                  onChange={(e) => setFeeRate(e.target.value)}
                  placeholder="0.001 for 0.1%"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Slippage rate (optional)</label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="0.1"
                  value={slippageRate}
                  onChange={(e) => setSlippageRate(e.target.value)}
                  placeholder="0.0005 for 0.05%"
                  className="mt-1"
                />
              </div>
              {completeness && (
                <div className="md:col-span-2 mt-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Data Availability</h3>
                  <DataCompletenessTimeline
                    data={completeness}
                    highlightStart={dateFrom}
                    highlightEnd={dateTo}
                  />
                </div>
              )}
              <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-gray-500">
                  Backtests run in the background. You can leave this page and results will still be saved.
                </p>
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                  {isSubmitting ? "Starting..." : "Run backtest"}
                </Button>
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Recent runs</h2>
              <Button
                variant="link"
                size="sm"
                onClick={loadBacktests}
                disabled={isLoadingBacktests}
                className="h-auto p-0"
              >
                {isLoadingBacktests ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
            {backtests.length === 0 ? (
              <p className="text-sm text-gray-500">No backtests yet. Run your first one above.</p>
            ) : (
              <div className="space-y-3">
                {backtests.map((run) => (
                  <button
                    key={run.run_id}
                    onClick={() => setSelectedRunId(run.run_id)}
                    className={`w-full rounded border px-3 py-2 text-left transition hover:border-blue-300 ${
                      selectedRunId === run.run_id ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">{formatDateTime(run.created_at, timezone)}</div>
                      {statusBadge(run.status)}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                      <span>
                        {formatDateTime(run.date_from, timezone).split(" ")[0]} →{" "}
                        {formatDateTime(run.date_to, timezone).split(" ")[0]}
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatPercent(run.total_return)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-gray-900">Run details</h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link
                href="/metrics-glossary"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Metrics glossary
              </Link>
              {selectedRun?.status === "completed" && selectedRun.summary && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Export
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
              )}
              {selectedRun && statusBadge(selectedRun.status)}
            </div>
          </div>
          {!selectedRunId && <p className="text-sm text-gray-500">Select a run to see details.</p>}
          {selectedRunId && !selectedRun && (
            <p className="text-sm text-gray-500">Loading backtest details...</p>
          )}
          {selectedRun && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">Range:</span>{" "}
                {selectedRunRange}
              </div>
              {selectedRun.status === "failed" ? (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {selectedRun.error_message || "Backtest failed. Please try again."}
                </div>
              ) : selectedRun.summary ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {getOrderedMetrics(selectedRun.summary, user?.favorite_metrics || null).map((metric) => {
                    const isPinned = user?.favorite_metrics?.includes(metric.key) || false;
                    const pinnedMetrics = user?.favorite_metrics || [];
                    const pinnedIndex = pinnedMetrics.indexOf(metric.key);

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
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Backtest is {selectedRun.status}. We&apos;ll keep polling for results.
                </p>
              )}

              {/* Data Quality Metrics */}
              {selectedRun.data_quality && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-700">Data Quality</h3>
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                    <div className="rounded border border-gray-200 bg-gray-50 p-2 sm:p-3">
                      <div className="text-xs text-gray-500">Gap %</div>
                      <div className="text-base font-semibold sm:text-lg">
                        {selectedRun.data_quality.gap_percent.toFixed(2)}%
                      </div>
                    </div>
                    <div className="rounded border border-gray-200 bg-gray-50 p-2 sm:p-3">
                      <div className="text-xs text-gray-500">Outliers</div>
                      <div className="text-base font-semibold sm:text-lg">
                        {selectedRun.data_quality.outlier_count}
                      </div>
                    </div>
                    <div className="col-span-2 rounded border border-gray-200 bg-gray-50 p-2 sm:p-3 lg:col-span-1">
                      <div className="text-xs text-gray-500">Volume Consistency</div>
                      <div className="text-base font-semibold sm:text-lg">
                        {selectedRun.data_quality.volume_consistency.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  {selectedRun.data_quality.has_issues && (
                    <div className="mt-2 text-xs text-yellow-600">
                      ⚠️ {selectedRun.data_quality.issues_description}
                    </div>
                  )}
                </div>
              )}

              {/* Data Completeness Summary */}
              {completeness && completeness.coverage_start && completeness.coverage_end && (
                <div className="mt-3 text-xs text-gray-600">
                  Data completeness: {completeness.completeness_percent.toFixed(1)}%
                  ({new Date(completeness.coverage_start).toLocaleDateString()} - {new Date(completeness.coverage_end).toLocaleDateString()}),
                  {completeness.gap_count} gap{completeness.gap_count !== 1 ? 's' : ''}
                </div>
              )}

              {/* Sentiment Context Strip */}
              {selectedRunId && selectedRun?.status === "completed" && (
                <BacktestSentimentStrip runId={selectedRunId} />
              )}
            </div>
          )}
        </section>

        {/* Equity Curve Chart - only show for completed runs */}
        {selectedRun?.status === "completed" && (
          <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">Equity Curve</h2>
                {isMobile && (
                  <span className="text-xs text-gray-500">(Pinch to zoom)</span>
                )}
              </div>
              {equityCurve.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => exportEquityToCSV(equityCurve, selectedRunId!)}
                    >
                      Download CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => exportEquityToJSON(equityCurve, selectedRunId!)}
                    >
                      Download JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {isLoadingEquityCurve ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-gray-500">Loading equity curve...</p>
              </div>
            ) : equityCurveError ? (
              <div className="flex h-64 items-center justify-center rounded border border-red-200 bg-red-50">
                <div className="text-center">
                  <p className="text-sm text-red-600">{equityCurveError}</p>
                  <Button variant="link" size="sm" onClick={refetchEquityCurve} className="mt-2">
                    Retry
                  </Button>
                </div>
              </div>
            ) : equityCurve.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-gray-500">No equity data available for this run.</p>
                  <Button variant="link" size="sm" onClick={refetchEquityCurve} className="mt-2">
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-64 sm:h-72 md:h-80">
                <ZoomableChart>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={(v) => formatChartDate(v, timezone)}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: "#e5e7eb" }}
                        tickCount={tickConfig.xAxisTicks}
                      />
                      <YAxis
                        tickFormatter={(v) => formatPrice(v, "").trim()}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: "#e5e7eb" }}
                        width={80}
                        tickCount={tickConfig.yAxisTicks}
                      />
                    <Tooltip
                      formatter={(value) => [formatPrice(Number(value)), "Equity"]}
                      labelFormatter={(label) => formatDateTime(label as string, timezone)}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "0.875rem" }}
                      iconType="line"
                    />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "#2563eb" }}
                      name="Strategy"
                    />
                    <Line
                      type="monotone"
                      dataKey="benchmark"
                      stroke="#9ca3af"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 5"
                      name="Buy & Hold"
                    />
                  </LineChart>
                </ResponsiveContainer>
                </ZoomableChart>
              </div>
            )}
          </section>
        )}

        {/* Drawdown Chart - only show for completed runs */}
        {selectedRun?.status === "completed" && (
          <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">Drawdown (%)</h2>
              {isMobile && (
                <span className="text-xs text-gray-500">(Pinch to zoom)</span>
              )}
            </div>

            {isLoadingEquityCurve ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-gray-500">Loading drawdown data...</p>
              </div>
            ) : equityCurveError ? (
              <div className="flex h-64 items-center justify-center rounded border border-red-200 bg-red-50">
                <div className="text-center">
                  <p className="text-sm text-red-600">{equityCurveError}</p>
                  <Button variant="link" size="sm" onClick={refetchEquityCurve} className="mt-2">
                    Retry
                  </Button>
                </div>
              </div>
            ) : drawdownData.length < 2 ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-gray-500">Not enough data to display drawdown chart</p>
              </div>
            ) : (
              <div className="h-64 sm:h-72 md:h-80">
                <ZoomableChart>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={drawdownData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={(v) => formatChartDate(v, timezone)}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: "#e5e7eb" }}
                        tickCount={tickConfig.xAxisTicks}
                      />
                      <YAxis
                        tickFormatter={(v) => `${v.toFixed(1)}%`}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: "#e5e7eb" }}
                        width={60}
                        tickCount={tickConfig.yAxisTicks}
                      />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(2)}%`, "Drawdown"]}
                      labelFormatter={(label) => formatDateTime(label as string, timezone)}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                      }}
                    />
                    <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                    {drawdownData.some((d) => d.isMaxDrawdown) && (
                      <ReferenceArea
                        x1={drawdownData.find((d) => d.isMaxDrawdown)?.timestamp}
                        x2={drawdownData.filter((d) => d.isMaxDrawdown).pop()?.timestamp}
                        fill="#fca5a5"
                        fillOpacity={0.2}
                        strokeOpacity={0}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="drawdown"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fill="url(#drawdownGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#ef4444" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                </ZoomableChart>
              </div>
            )}
          </section>
        )}

        {/* Position Analysis - only show for completed runs */}
        {selectedRun?.status === 'completed' &&
          (() => {
            const timeframeSeconds = timeframeToSeconds(selectedRun.timeframe);
            const positionStats = computePositionStats(trades, timeframeSeconds);

            return (
              <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
                <h2 className="mb-3 text-base font-semibold text-gray-900">
                  Position Analysis
                </h2>

                {!positionStats ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <p className="text-sm text-gray-500">
                      Not enough trades to analyze. Need at least 2 trades.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {/* Average Hold Time */}
                      {!positionStats.hasMissingTimestamps && (
                        <div className="rounded border border-gray-200 bg-gray-50 p-2 sm:p-3">
                          <div className="text-xs uppercase text-gray-500">
                            Avg Hold
                          </div>
                          <div className="text-base font-semibold text-gray-900 sm:text-lg">
                            {formatDuration(positionStats.avgHoldSeconds)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {positionStats.avgHoldBars.toFixed(1)} bars
                          </div>
                        </div>
                      )}

                      {/* Longest Position */}
                      {!positionStats.hasMissingTimestamps && (
                        <div className="rounded border border-gray-200 bg-gray-50 p-2 sm:p-3">
                          <div className="text-xs uppercase text-gray-500">
                            Longest
                          </div>
                          <div className="text-base font-semibold text-gray-900 sm:text-lg">
                            {formatDuration(positionStats.longestHoldSeconds)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {positionStats.longestHoldBars.toFixed(1)} bars
                          </div>
                        </div>
                      )}

                      {/* Shortest Position */}
                      {!positionStats.hasMissingTimestamps && (
                        <div className="rounded border border-gray-200 bg-gray-50 p-2 sm:p-3">
                          <div className="text-xs uppercase text-gray-500">
                            Shortest
                          </div>
                          <div className="text-base font-semibold text-gray-900 sm:text-lg">
                            {formatDuration(positionStats.shortestHoldSeconds)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {positionStats.shortestHoldBars.toFixed(1)} bars
                          </div>
                        </div>
                      )}

                      {/* Average Position Size */}
                      {!positionStats.hasMissingPositionData &&
                        positionStats.avgPositionSize > 0 && (
                          <div className="rounded border border-gray-200 bg-gray-50 p-2 sm:p-3">
                            <div className="text-xs uppercase text-gray-500">
                              Avg Size
                            </div>
                            <div className="text-base font-semibold text-gray-900 sm:text-lg">
                              {formatMoney(positionStats.avgPositionSize)}
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Interpretation Helper */}
                    {!positionStats.hasMissingTimestamps &&
                      positionStats.avgHoldSeconds > 0 && (
                        <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                          {getHoldTimeInterpretation(
                            positionStats.avgHoldSeconds
                          )}
                        </div>
                      )}

                    {/* Warning Messages */}
                    {positionStats.hasMissingTimestamps && (
                      <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        Some trades have missing or invalid timestamps. Hold
                        time statistics are hidden.
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })()}

        {/* Seasonality Analysis - only show for completed runs */}
        {selectedRun?.status === "completed" && (
          <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              Seasonality Analysis
            </h2>

            {trades.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">
                  No trades available for seasonality analysis.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Tabs value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
                  <TabsList>
                    <TabsTrigger value="month">Month</TabsTrigger>
                    <TabsTrigger value="quarter">Quarter</TabsTrigger>
                    <TabsTrigger value="weekday">Weekday</TabsTrigger>
                  </TabsList>
                  <TabsContent value={periodType} className="mt-4">
                    <div
                      className={`grid gap-2 ${
                        periodType === "month"
                          ? "grid-cols-4 sm:grid-cols-6 lg:grid-cols-12"
                          : periodType === "quarter"
                          ? "grid-cols-2 sm:grid-cols-4"
                          : "grid-cols-4 sm:grid-cols-7"
                      }`}
                    >
                      {seasonalityData.map((bucket, idx) => (
                        <div
                          key={idx}
                          className={`rounded border p-2 text-center sm:p-3 ${getColorClass(bucket.avgReturn)}`}
                          title={`${bucket.label}: ${formatPercent(bucket.avgReturn)} avg return, ${bucket.count} trades`}
                        >
                          <div className="text-xs font-medium">{bucket.label}</div>
                          <div className="mt-0.5 text-xs font-semibold sm:mt-1 sm:text-sm">
                            {bucket.count > 0 ? formatPercent(bucket.avgReturn) : "—"}
                          </div>
                          <div className="mt-0.5 hidden text-xs opacity-75 sm:block">
                            {bucket.count} {bucket.count === 1 ? "trade" : "trades"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </section>
        )}

        {/* Trade Distribution Analysis - only show for completed runs */}
        {selectedRun?.status === "completed" && (
          <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              Trade Distribution
            </h2>

            {trades.length < 3 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">
                  Not enough trades to analyze. Need at least 3 trades.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Return Distribution Histogram */}
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700">Return Distribution</h3>
                  <div className="h-64 sm:h-72 md:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={returnDistribution}
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                      >
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={{ stroke: "#e5e7eb" }}
                        />
                        <YAxis
                          label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={{ stroke: "#e5e7eb" }}
                        />
                        <Tooltip
                          formatter={(value) => [
                            `${value} trades (${formatPercent((value as number / trades.length) * 100)})`,
                            'Count'
                          ]}
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "0.375rem",
                            fontSize: "0.875rem",
                          }}
                        />
                        <Bar
                          dataKey="count"
                          fill="#2563eb"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Duration Distribution (bars) */}
                {durationDistribution && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-gray-700">
                      Duration Distribution (bars)
                    </h3>
                    <div className="h-64 sm:h-72 md:h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={durationDistribution}
                          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                        >
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#e5e7eb" }}
                          />
                          <YAxis
                            label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#e5e7eb" }}
                          />
                          <Tooltip
                            formatter={(value) => [
                              `${value} trades (${formatPercent(durationDistributionTotal > 0 ? (value as number / durationDistributionTotal) * 100 : 0)})`,
                              'Count'
                            ]}
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #e5e7eb",
                              borderRadius: "0.375rem",
                              fontSize: "0.875rem",
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="#2563eb"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Skew Callout */}
                <div className={`rounded-lg border p-3 text-sm ${
                  skewCallout.includes('Review risk')
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}>
                  {skewCallout}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Trades Table - only show for completed runs */}
        {selectedRun?.status === "completed" && (
          <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-gray-900">Trades</h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {trades.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => exportTradesToCSV(trades, selectedRunId!)}
                      >
                        Download CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => exportTradesToJSON(trades, selectedRunId!)}
                      >
                        Download JSON
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {trades.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{trades.length} total</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {isLoadingTrades ? (
              <p className="text-sm text-gray-500">Loading trades...</p>
            ) : tradesError ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-red-600">{tradesError}</p>
                <Button variant="link" size="sm" onClick={refetchTrades} className="h-auto p-0">
                  Retry
                </Button>
              </div>
            ) : trades.length === 0 ? (
              <p className="text-sm text-gray-500">No trades were generated for this run.</p>
            ) : (
              <>
                {/* Mobile: Card-based layout */}
                <div className="space-y-3 md:hidden">
                  {paginatedTrades.map((trade, idx) => (
                    <button
                      key={`${trade.entry_time}-${idx}`}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-left transition hover:border-blue-300"
                      onClick={() => setSelectedTradeIdx((currentPage - 1) * pageSize + idx)}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium uppercase text-gray-500">{trade.side}</span>
                        <span className={`text-sm font-semibold ${trade.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {trade.pnl_pct >= 0 ? "+" : ""}{formatPercent(trade.pnl_pct).replace("%", "")}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-gray-500">Entry</div>
                          <div className="font-medium">{formatPrice(trade.entry_price)}</div>
                          <div className="text-xs text-gray-500">{formatDateTime(trade.entry_time, timezone)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Exit</div>
                          <div className="font-medium">{formatPrice(trade.exit_price)}</div>
                          <div className="text-xs text-gray-500">{formatDateTime(trade.exit_time, timezone)}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between border-t border-gray-200 pt-2">
                        <span className="text-xs text-gray-500">P&L</span>
                        <span className={`text-sm font-medium ${trade.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatMoney(trade.pnl, "USDT", true)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Desktop: Table layout */}
                <div className="hidden overflow-x-auto rounded-lg border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          Entry {timezone === "utc" ? "(UTC)" : ""}
                        </TableHead>
                        <TableHead>Entry Price</TableHead>
                        <TableHead>
                          Exit {timezone === "utc" ? "(UTC)" : ""}
                        </TableHead>
                        <TableHead>Exit Price</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead className="text-right">P&L</TableHead>
                        <TableHead className="text-right">P&L %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTrades.map((trade, idx) => (
                        <TableRow
                          key={`${trade.entry_time}-${idx}`}
                          className="cursor-pointer"
                          onClick={() => setSelectedTradeIdx((currentPage - 1) * pageSize + idx)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedTradeIdx((currentPage - 1) * pageSize + idx);
                            }
                          }}
                        >
                          <TableCell>
                            {formatDateTime(trade.entry_time, timezone)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatPrice(trade.entry_price)}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(trade.exit_time, timezone)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatPrice(trade.exit_price)}
                          </TableCell>
                          <TableCell className="text-muted-foreground uppercase">
                            {trade.side}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatMoney(trade.pnl, "USDT", true)}
                          </TableCell>
                          <TableCell
                            className={`text-right ${
                              trade.pnl_pct >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {trade.pnl_pct >= 0 ? "+" : ""}{formatPercent(trade.pnl_pct).replace("%", "")}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
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
    </div>
  );
}
