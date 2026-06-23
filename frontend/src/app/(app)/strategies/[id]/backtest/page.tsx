"use client";

import { type CSSProperties, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ApiError } from "@/lib/api";
import { BacktestsApiClient, type BacktestCreateRequest, type BatchCreateRequest } from "@/lib/api/backtests-client";
import { MarketApiClient } from "@/lib/api/market-client";
import { StrategiesApiClient } from "@/lib/api/strategies-client";
import { UsersApiClient } from "@/lib/api/users-client";
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
import { useRestoreSnapshot } from "@/hooks/useRestoreSnapshot";
import { useResultViewedTracking } from "@/hooks/useResultViewedTracking";
import { useLessonCompletion } from "@/hooks/useLessonCompletion";
import { useDraftReviewState } from "@/hooks/useDraftReviewState";
import { useDeferredDelete } from "@/hooks/useDeferredDelete";
import { useExitGuard } from "@/hooks/useExitGuard";
import { Strategy, StrategyVersion } from "@/types/strategy";
import {
  BacktestListItem,
  BacktestStatus,
  BacktestStatusResponse,
  BatchRunResult,
  DataAvailabilityResponse,
  DataQualityMetrics,
  DataCompletenessResponse,
  TradeDetail,
} from "@/types/backtest";
import { PlanResponse } from "@/types/auth";
import { StrategyTabs } from "@/components/StrategyTabs";
import TradeDrawer from "@/components/TradeDrawer";
import { WhatYouLearnedCard } from "@/components/WhatYouLearnedCard";
import { NarrativeCard } from "@/components/NarrativeCard";
import { LowTradeCountWarning } from "@/components/LowTradeCountWarning";
import { DataAvailabilitySection } from "@/components/DataAvailabilitySection";
import { ShareBacktestModal } from "@/components/ShareBacktestModal";
import { DraftReviewControls } from "@/components/backtest/DraftReviewControls";
import { DraftExitGuardModal } from "@/components/DraftExitGuardModal";
import { TransactionCostAnalysis } from "@/components/TransactionCostAnalysis";
import { PerformanceAlertPanel } from "@/components/backtest/PerformanceAlertPanel";
import {
  computeSeasonality,
  computeReturnDistribution,
  computeDurationDistribution,
  computePositionStats,
  computeSkew,
  computeSkewCallout,
  getSeasonalityLabels,
  getSeasonalityBucketIndex,
  timeframeToSeconds,
  type PeriodType,
  type SeasonalityBucket,
  type SeasonalityYearRow,
  type DistributionBucket,
  type PositionStats,
} from "@/lib/backtest-analysis";
import { trackBacktestView } from "@/lib/recent-views";
import { trackBacktestStarted } from "@/lib/backtest-tracking";
import { getSummaryCardSeen, markSummaryCardSeen } from "@/lib/summary-card-storage";
import { useWjlCardEnrollment } from "@/hooks/useWjlCardEnrollment";
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
import { BacktestPageHeader } from "@/components/backtest/PageHeader";
import { RunConfig } from "@/components/backtest/RunConfig";
import { KPIStrip } from "@/components/backtest/KPIStrip";
import { DrawdownSection } from "@/components/backtest/DrawdownSection";
import { PositionAnalysisCard } from "@/components/backtest/PositionAnalysisCard";
import { TradesSection } from "@/components/backtest/TradesSection";
import { DistributionRow } from "@/components/backtest/DistributionRow";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const SEASONALITY_PERCENT_FORMATTER = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  useGrouping: false,
});

function formatSeasonalityPercent(value: number): string {
  return `${value >= 0 ? "+" : "-"}${SEASONALITY_PERCENT_FORMATTER.format(Math.abs(value))}%`;
}

function getSeasonalityGridClass(periodType: PeriodType): string {
  if (periodType === "month") return "grid-cols-12 min-w-[720px]";
  if (periodType === "quarter") return "grid-cols-4 min-w-[360px]";
  return "grid-cols-7 min-w-[560px]";
}

/** Map a single heatmap cell's return value to CSS colour properties.
 *  Uses design-system tokens (`--success` / `--destructive`) for both
 *  background and text so dark-mode is handled automatically. */
function getSeasonalityCellStyle(
  avgReturn: number,
  count: number,
  scaleMax: number
): CSSProperties {
  if (count === 0) {
    return {
      backgroundColor: "hsl(var(--muted-foreground) / 0.08)",
      borderColor: "hsl(var(--muted-foreground) / 0.12)",
      color: "hsl(var(--muted-foreground) / 0.7)",
    };
  }

  const intensity = Math.min(Math.abs(avgReturn) / Math.max(scaleMax, 0.01), 1);
  const easedIntensity = Math.pow(intensity, 0.8);
  const alpha = 0.14 + easedIntensity * 0.78;
  const isPositive = avgReturn >= 0;
  const token = isPositive ? "--success" : "--destructive";

  return {
    backgroundColor: `hsl(var(${token}) / ${alpha})`,
    borderColor: `hsl(var(${token}) / ${Math.min(alpha + 0.08, 1)})`,
    color: getCellColor(easedIntensity, isPositive),
  };
}

/** Returns an appropriate foreground colour for a heatmap cell based on
 *  intensity (high-intensity cells get a contrast-safe foreground from the
 *  design token; low-intensity cells echo the semantic success/destructive
 *  colour so the text stays readable against the lightly-tinted background). */
function getCellColor(easedIntensity: number, isPositive: boolean): string {
  if (easedIntensity > 0.72) return "hsl(var(--primary-foreground))";
  return isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))";
}

export default function StrategyBacktestPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { timezone } = useDisplay();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // The wizard preselects the just-completed run via `?run={runId}` so the
  // verdict renders immediately instead of landing on a run list (ADR-0008).
  const preselectedRunId = searchParams.get("run");

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [strategyVersion, setStrategyVersion] = useState<StrategyVersion | null>(null);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [selectedRunId, setSelectedRunId] = useState<string | null>(() => preselectedRunId);
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
  const [tier2Open, setTier2Open] = useState(false);
  const [tier3Open, setTier3Open] = useState(false);

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
      // Job telemetry only (poll-transition signal) — NOT the activation
      // signal. Activation is the canonical `results_viewed` event, fired
      // by useResultViewedTracking when the verdict actually renders. See
      // ADR-0008.
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
    refetch: refetchRunResults,
  } = useBacktestResults(selectedRunId, handleRunDetailFetched);

  const { restoreFromVersion, isRestoring } = useRestoreSnapshot(id);

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
        StrategiesApiClient.get(id),
        StrategiesApiClient.listVersions(id).catch(() => null),
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
      const data = await BacktestsApiClient.list({
        strategy_id: id,
        limit: runsPageSize,
        offset,
      });
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

  // Canonical activation event (ADR-0008): fires `results_viewed` once per
  // completed run, deduped inside the shared tracker. `entryPath` is the
  // loaded strategy's true persisted value (ADR-0009) — gating `status` on
  // `strategy` being loaded ensures the event never fires on a `null`
  // placeholder while the strategy is still in flight, which would otherwise
  // get permanently baked in as the `unknown` cohort by dedup.
  useResultViewedTracking({
    runId: selectedRunId,
    status: strategy ? selectedRun?.status ?? null : null,
    strategyId: id,
    entryPath: strategy?.entry_path ?? null,
    userId: user?.id,
  });

  // Literacy track completion (slice #695): fires POST /lesson-completion/record
  // once per run when the verdict is viewed. Non-critical — swallows errors.
  useLessonCompletion({
    strategyId: id,
    runId: selectedRunId,
    status: strategy ? selectedRun?.status ?? null : null,
  });

  // NL-wedge review surface (ADR-0012, Module B): Accept keeps the strategy
  // and unlocks Share; Edit keeps the strategy and routes to the canvas as an
  // ordinary working copy.
  const draftReview = useDraftReviewState({
    strategyId: id,
    entryPath: strategy?.entry_path ?? null,
    userId: user?.id,
  });

  // NL-wedge Reject (ADR-0012 §7, Module D): one click hides the review
  // controls and starts a grace-window Undo toast. Only once the window
  // elapses without Undo does the hard-delete commit and
  // `nl_draft_outcome = rejected` get logged; Undo or an interrupt (e.g.
  // navigating away) resolves to keep — nothing is deleted or logged.
  const [isRejectPending, setIsRejectPending] = useState(false);

  const { scheduleDelete: scheduleReject } = useDeferredDelete({
    onCommit: () => {
      void (async () => {
        try {
          await StrategiesApiClient.delete(id);
          draftReview.reject();
          router.push("/strategies");
        } catch (err) {
          setIsRejectPending(false);
          setError(err instanceof Error ? err.message : "Failed to reject strategy");
        }
      })();
    },
    onUndo: () => setIsRejectPending(false),
  });

  const handleReject = useCallback(() => {
    setIsRejectPending(true);
    scheduleReject(`"${strategy?.name ?? "Strategy"}" rejected`);
  }, [scheduleReject, strategy?.name]);

  // NL-wedge confirm-on-exit guard (ADR-0012 §6, Module C). In-app
  // navigation away from an under-review draft opens a Keep / Discard /
  // Cancel modal; Discard hard-deletes via the same #602 cascade as Reject.
  // A hard browser exit only shows the native beforeunload prompt and
  // always resolves to keep — no unload-delete is attempted.
  const exitGuard = useExitGuard({
    isArmed: draftReview.isUnderReview,
    onKeep: draftReview.keep,
    onDiscard: async () => {
      await StrategiesApiClient.delete(id);
      draftReview.reject();
    },
  });

  // Fetch user plan to check for premium features
  useEffect(() => {
    UsersApiClient.getProfile()
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
    setSelectedPeriods(new Set(["1y"]));
  }, [userPlan]);

  // Fetch data quality metrics when dates or strategy change
  useEffect(() => {
    if (!strategy || !dateFrom || !dateTo) {
      setDataQuality(null);
      return;
    }

    BacktestsApiClient.getDataQuality(strategy.asset, strategy.timeframe, dateFrom, dateTo)
      .then((data) => setDataQuality(data))
      .catch(() => setDataQuality(null));
  }, [strategy, dateFrom, dateTo]);

  // Fetch data completeness metrics when strategy loads
  useEffect(() => {
    if (!strategy) {
      setCompleteness(null);
      return;
    }

    BacktestsApiClient.getDataCompleteness(strategy.asset, strategy.timeframe)
      .then((data) => setCompleteness(data))
      .catch(() => setCompleteness(null));
  }, [strategy]);

  // Fetch data availability when strategy loads
  useEffect(() => {
    if (!strategy) {
      setDataAvailability(null);
      return;
    }

    MarketApiClient.getDataAvailability(strategy.asset, strategy.timeframe)
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
      const res = await BacktestsApiClient.create(payload as unknown as BacktestCreateRequest);
      trackBacktestStarted({
        strategyId: id,
        entryPath: strategy?.entry_path ?? null,
        runId: res.run_id,
        dateFrom,
        dateTo,
        userId: user?.id,
      });
      toast.success("Backtest started", { description: "It will update automatically when finished." });
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
    setActiveBatchId(null);
    setBatchSkippedRuns([]);

    const payload: Record<string, unknown> = {
      strategy_id: id,
      periods: Array.from(selectedPeriods),
    };
    if (feeRate) payload.fee_rate = Number(feeRate);
    if (slippageRate) payload.slippage_rate = Number(slippageRate);

    try {
      const res = await BacktestsApiClient.createBatch(payload as unknown as BatchCreateRequest);
      trackEvent("batch_backtest_started", {
        strategy_id: id,
        batch_id: res.batch_id,
        periods: Array.from(selectedPeriods),
        period_count: selectedPeriods.size,
      }, user?.id);
      setActiveBatchId(res.batch_id);
      setBatchSkippedRuns(res.runs.filter((r) => r.status === "skipped"));
      const queuedCount = res.runs.filter((r) => r.status === "pending").length;
      toast.success(`Batch started: ${queuedCount} backtest${queuedCount !== 1 ? "s" : ""} queued`, { description: "Results will appear below as runs complete." });
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
        e.preventDefault();
        if (e.repeat || isSubmitting) return;
        const form = customFormRef.current;
        if (form) {
          form.dispatchEvent(
            new Event("submit", { cancelable: true, bubbles: true })
          );
        } else {
          toast.info("Open custom dates to run a single backtest, or use Run All.");
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

  const selectedRunRange = useMemo(() => {
    if (!selectedRun) return null;
    return `${formatDateTime(selectedRun.date_from, timezone).split(" ")[0]} → ${formatDateTime(selectedRun.date_to, timezone).split(" ")[0]}`;
  }, [selectedRun, timezone]);

  const isZeroTradeRun =
    selectedRun?.status === "completed" &&
    selectedRun?.summary?.num_trades === 0;

  const isZeroTradeNarrativeMode =
    isZeroTradeRun && Boolean(selectedRun?.narrative);

  // What-you-learned card eligibility (ADR-0010): completed, non-zero-trade
  // run, with summary, first-run gate open, and a non-null benchmark return.
  // This is the wjl_retention_ab enrollment/exposure moment.
  const wjlEligible = Boolean(
    showSummaryCard &&
      selectedRun?.status === "completed" &&
      !isZeroTradeNarrativeMode &&
      selectedRun?.summary != null &&
      selectedRun.summary.benchmark_return_pct != null
  );

  const showWhatYouLearnedCard = useWjlCardEnrollment(wjlEligible, () =>
    setShowSummaryCard(false)
  );

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
        onRestoreSnapshot={restoreFromVersion}
        isRestoring={isRestoring}
        isSubmitting={isSubmitting}
        selectedPeriodCount={selectedPeriods.size}
        runStatus={selectedRun?.status ?? null}
        runRange={selectedRunRange}
        shareLocked={draftReview.isUnderReview}
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

            {/* Pending/running context (status pill shown in header) */}
            {selectedRun.status !== "completed" && selectedRun.status !== "failed" && (
              <p className="text-sm text-muted-foreground">
                Results will appear automatically once the run finishes.
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
            {/* Results boundary */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {selectedRunRange ?? "Results"}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* NL-wedge review surface (ADR-0012, Module B/D) */}
            {draftReview.isUnderReview && !isRejectPending && (
              <DraftReviewControls
                onAccept={draftReview.accept}
                onEdit={() => {
                  draftReview.edit();
                  router.push(`/strategies/${id}`);
                }}
                onReject={handleReject}
              />
            )}

            {/* KPI Strip */}
            <KPIStrip
              summary={selectedRun.summary}
              trades={trades}
              positionStats={positionStatsForKPI}
            />

            {/* What You Learned — first-run only, gated by wjl_retention_ab (ADR-0010) */}
            {showWhatYouLearnedCard &&
              selectedRun.summary.benchmark_return_pct != null && (
                <WhatYouLearnedCard
                  strategyReturnPct={selectedRun.summary.total_return_pct}
                  benchmarkReturnPct={selectedRun.summary.benchmark_return_pct}
                  initialBalance={selectedRun.summary.initial_balance}
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
                        <Button variant="link" size="sm" onClick={refetchRunResults} className="mt-2">Retry</Button>
                      </div>
                    </div>
                  ) : equityCurve.length === 0 ? (
                    <div className="flex h-56 items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">No equity data available.</p>
                        <Button variant="link" size="sm" onClick={refetchRunResults} className="mt-2">Retry</Button>
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

            {/* Tier 2 — Risk & Position Analysis */}
            <button
              type="button"
              onClick={() => setTier2Open((v) => !v)}
              className="flex w-full items-center gap-2 py-1 text-left"
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform duration-150",
                  tier2Open && "rotate-90"
                )}
              />
              <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Risk &amp; Position Analysis
              </span>
            </button>

            {tier2Open && (
              <div className="mt-1 space-y-5">
                {/* Drawdown */}
                <DrawdownSection
                  drawdownData={drawdownData}
                  summary={selectedRun.summary}
                  isLoading={isLoadingEquityCurve}
                  error={equityCurveError}
                  onRetry={refetchRunResults}
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
              </div>
            )}

            {/* Tier 3 — Distribution & Trades */}
            <button
              type="button"
              onClick={() => setTier3Open((v) => !v)}
              className="flex w-full items-center gap-2 py-1 text-left"
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform duration-150",
                  tier3Open && "rotate-90"
                )}
              />
              <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Distribution &amp; Trades
              </span>
            </button>

            {tier3Open && (
              <div className="mt-1 space-y-5">
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
                    <Button variant="link" size="sm" onClick={refetchRunResults} className="h-auto p-0">Retry</Button>
                  </div>
                )}

                {/* Transaction Cost Analysis */}
                <TransactionCostAnalysis summary={selectedRun.summary} />
              </div>
            )}

            {/* Performance alert — create or manage alerts pinned to this run */}
            {selectedRunId && (
              <div className="rounded border border-border bg-card p-4">
                <h3 className="mb-1 text-[15px] font-semibold">Performance alert</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Get notified daily when this strategy version triggers a signal or hits a
                  drawdown level.
                </p>
                <PerformanceAlertPanel
                  backtestRunId={selectedRunId}
                  strategyId={id}
                  backtestRunVersionId={selectedRun?.strategy_version_id}
                />
              </div>
            )}
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

      {/* NL-wedge confirm-on-exit guard (ADR-0012 §6, Module C) */}
      <DraftExitGuardModal
        open={exitGuard.isModalOpen}
        onKeep={exitGuard.handleKeep}
        onDiscard={exitGuard.handleDiscard}
        onCancel={exitGuard.handleCancel}
      />

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
