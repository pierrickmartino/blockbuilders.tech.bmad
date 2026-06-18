"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Lightbulb, Loader2 } from "lucide-react";
import { BacktestsApiClient } from "@/lib/api/backtests-client";
import type { CoachResponse, TradeCoachingItem, TradeDetail } from "@/types/backtest";
import { formatDateTime, formatPercent, TimezoneMode } from "@/lib/format";
import { useDisplay } from "@/context/display";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const TradeDrawer = dynamic(() => import("@/components/TradeDrawer"), { ssr: false });

const SUPPRESSION_MESSAGES: Record<string, string> = {
  same_version: "Same strategy on both runs — nothing to explain.",
  "tier_no-diff": "Same strategy on both runs — nothing to explain.",
  no_overlap: "These runs barely overlap — not enough common history to compare.",
  insufficient_overlap: "These runs barely overlap — not enough common history to compare.",
  different_strategy: "These runs use different strategies — coaching requires shared lineage.",
  failed_comparison: "We couldn't generate the comparison — please try again later.",
};

interface CoachingPanelProps {
  runIdA: string;
  runIdB: string;
  assetA: string;
  timeframeA: string;
}

function InsightBadge({ type }: { type: string }) {
  if (type === "stop_tightened") {
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        stop tightened
      </span>
    );
  }
  if (type === "stop_loosened") {
    return (
      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        stop loosened
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      neutral
    </span>
  );
}

function TradeInsightRow({
  item,
  runIdA,
  runIdB,
  assetA,
  timeframeA,
  tradeIndexA,
  tradeIndexB,
  timezone,
}: {
  item: TradeCoachingItem;
  runIdA: string;
  runIdB: string;
  assetA: string;
  timeframeA: string;
  tradeIndexA: number | null;
  tradeIndexB: number | null;
  timezone: TimezoneMode;
}) {
  const [drawerRunId, setDrawerRunId] = useState<string | null>(null);
  const [drawerTradeIdx, setDrawerTradeIdx] = useState<number | null>(null);

  return (
    <>
      <tr className="border-b border-border text-sm last:border-0">
        <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">
          {formatDateTime(item.entry_time, timezone)}
        </td>
        <td className="py-2 pr-4">
          <InsightBadge type={item.insight_type} />
        </td>
        <td className="py-2 pr-4">
          <button
            className={cn(
              "text-sm tabular-nums",
              item.pnl_a >= 0 ? "text-primary" : "text-destructive",
              tradeIndexA !== null ? "underline decoration-dotted cursor-pointer" : ""
            )}
            onClick={() => {
              if (tradeIndexA !== null) {
                setDrawerRunId(runIdA);
                setDrawerTradeIdx(tradeIndexA);
              }
            }}
            disabled={tradeIndexA === null}
          >
            {item.pnl_a >= 0 ? "+" : ""}{formatPercent(item.pnl_pct_a)}
            <span className="ml-1 text-xs text-muted-foreground">({item.exit_reason_a})</span>
          </button>
        </td>
        <td className="py-2">
          <button
            className={cn(
              "text-sm tabular-nums",
              item.pnl_b >= 0 ? "text-primary" : "text-destructive",
              tradeIndexB !== null ? "underline decoration-dotted cursor-pointer" : ""
            )}
            onClick={() => {
              if (tradeIndexB !== null) {
                setDrawerRunId(runIdB);
                setDrawerTradeIdx(tradeIndexB);
              }
            }}
            disabled={tradeIndexB === null}
          >
            {item.pnl_b >= 0 ? "+" : ""}{formatPercent(item.pnl_pct_b)}
            <span className="ml-1 text-xs text-muted-foreground">({item.exit_reason_b})</span>
          </button>
        </td>
      </tr>

      {drawerRunId !== null && drawerTradeIdx !== null && (
        <TradeDrawer
          runId={drawerRunId}
          tradeIdx={drawerTradeIdx}
          asset={assetA}
          timeframe={timeframeA}
          onClose={() => {
            setDrawerRunId(null);
            setDrawerTradeIdx(null);
          }}
        />
      )}
    </>
  );
}

export function CoachingPanel({ runIdA, runIdB, assetA, timeframeA }: CoachingPanelProps) {
  const { timezone } = useDisplay();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [coaching, setCoaching] = useState<CoachResponse | null>(null);
  const [tradesA, setTradesA] = useState<TradeDetail[]>([]);
  const [tradesB, setTradesB] = useState<TradeDetail[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleExplain = async () => {
    if (coaching) {
      setIsExpanded((prev) => !prev);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [result, tA, tB] = await Promise.all([
        BacktestsApiClient.coach(runIdA, runIdB),
        BacktestsApiClient.getTrades(runIdA),
        BacktestsApiClient.getTrades(runIdB),
      ]);
      setCoaching(result);
      setTradesA(tA);
      setTradesB(tB);
      if (result.eligible && result.status === "ready") setIsExpanded(true);
    } catch {
      setError("Failed to load coaching. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const findTradeIndex = (trades: TradeDetail[], entryTime: string): number | null => {
    const idx = trades.findIndex(
      (t) => new Date(t.entry_time).getTime() === new Date(entryTime).getTime()
    );
    return idx >= 0 ? idx : null;
  };

  const showPanel = coaching?.eligible && isExpanded;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Tweak coaching</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExplain}
          disabled={isLoading}
          className="gap-1.5"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : coaching ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : null}
          Explain this delta
        </Button>
      </div>

      {error && (
        <p className="border-t border-border px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      {coaching && !coaching.eligible && (
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          {SUPPRESSION_MESSAGES[coaching.reason] ?? `Not eligible for coaching (${coaching.reason.replace(/_/g, " ")}).`}
        </p>
      )}

      {coaching?.eligible && coaching.status === "pending" && (
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          Preparing comparison runs — check back shortly.
        </p>
      )}

      {showPanel && coaching && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <p className="mb-3 text-sm font-medium text-foreground">{coaching.headline}</p>

          {coaching.insights.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Entry time</th>
                    <th className="pb-2 pr-4 font-medium">Change</th>
                    <th className="pb-2 pr-4 font-medium">Run 1 outcome</th>
                    <th className="pb-2 font-medium">Run 2 outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {coaching.insights.map((item) => (
                    <TradeInsightRow
                      key={item.entry_time}
                      item={item}
                      runIdA={runIdA}
                      runIdB={runIdB}
                      assetA={assetA}
                      timeframeA={timeframeA}
                      tradeIndexA={findTradeIndex(tradesA, item.entry_time)}
                      tradeIndexB={findTradeIndex(tradesB, item.entry_time)}
                      timezone={timezone}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              All matched trades behaved identically under the new stop-loss.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
