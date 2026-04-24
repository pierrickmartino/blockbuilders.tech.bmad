"use client";

import { TradeDetail } from "@/types/backtest";
import { formatDuration, formatMoney } from "@/lib/format";
import { useMemo } from "react";

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

interface PositionAnalysisCardProps {
  trades: TradeDetail[];
  timeframe: string;
}

function timeframeToSeconds(timeframe: string): number {
  const match = timeframe.match(/^(\d+)([mhdw])$/);
  if (!match) return 86400;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "m":
      return value * 60;
    case "h":
      return value * 3600;
    case "d":
      return value * 86400;
    case "w":
      return value * 604800;
    default:
      return 86400;
  }
}

function computePositionStats(trades: TradeDetail[], timeframeSeconds: number): PositionStats | null {
  if (trades.length < 2) return null;

  let totalDuration = 0;
  let minDuration = Infinity;
  let maxDuration = -Infinity;
  let totalPositionSize = 0;
  let validDurationCount = 0;
  let validPositionCount = 0;
  let hasMissingTimestamps = false;
  let hasMissingPositionData = false;

  for (const trade of trades) {
    if (trade.duration_seconds != null && trade.duration_seconds >= 0) {
      totalDuration += trade.duration_seconds;
      minDuration = Math.min(minDuration, trade.duration_seconds);
      maxDuration = Math.max(maxDuration, trade.duration_seconds);
      validDurationCount++;
    } else {
      hasMissingTimestamps = true;
    }

    if (trade.entry_price != null && trade.qty != null && trade.entry_price > 0 && trade.qty > 0) {
      totalPositionSize += trade.entry_price * trade.qty;
      validPositionCount++;
    } else {
      hasMissingPositionData = true;
    }
  }

  const avgHoldSeconds = validDurationCount > 0 ? totalDuration / validDurationCount : 0;

  return {
    avgHoldSeconds,
    avgHoldBars: avgHoldSeconds / timeframeSeconds,
    longestHoldSeconds: maxDuration !== -Infinity ? maxDuration : 0,
    longestHoldBars: (maxDuration !== -Infinity ? maxDuration : 0) / timeframeSeconds,
    shortestHoldSeconds: minDuration !== Infinity ? minDuration : 0,
    shortestHoldBars: (minDuration !== Infinity ? minDuration : 0) / timeframeSeconds,
    avgPositionSize: validPositionCount > 0 ? totalPositionSize / validPositionCount : 0,
    hasMissingTimestamps,
    hasMissingPositionData,
  };
}

export function PositionAnalysisCard({ trades, timeframe }: PositionAnalysisCardProps) {
  const positionStats = useMemo(() => {
    const tfs = timeframeToSeconds(timeframe);
    return computePositionStats(trades, tfs);
  }, [trades, timeframe]);

  return (
    <div>
      {/* Header */}
      <div className="pb-4">
        <h2 className="text-[15px] font-semibold">Position analysis</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">How long positions are held and sized</p>
      </div>

      {/* Body */}
      {!positionStats ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Not enough trades to analyze. Need at least 2 trades.</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {/* Row 1 */}
            {!positionStats.hasMissingTimestamps && (
              <div className="flex items-center py-3">
                <div className="flex-1">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg hold</div>
                  <div className="mt-1.5 flex items-baseline gap-1"><span className="font-mono text-xl font-semibold tabular-nums leading-tight text-foreground">{formatDuration(positionStats.avgHoldSeconds)}</span></div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{positionStats.avgHoldBars.toFixed(1)} bars</div>
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Longest</div>
                  <div className="mt-1.5 flex items-baseline gap-1"><span className="font-mono text-xl font-semibold tabular-nums leading-tight text-foreground">{formatDuration(positionStats.longestHoldSeconds)}</span></div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{positionStats.longestHoldBars.toFixed(1)} bars</div>
                </div>
              </div>
            )}

            {/* Row 2 */}
            {!positionStats.hasMissingTimestamps && (
              <div className="flex items-center py-3">
                <div className="flex-1">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Shortest</div>
                  <div className="mt-1.5 flex items-baseline gap-1"><span className="font-mono text-xl font-semibold tabular-nums leading-tight text-foreground">{formatDuration(positionStats.shortestHoldSeconds)}</span></div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{positionStats.shortestHoldBars.toFixed(1)} bars</div>
                </div>
                {!positionStats.hasMissingPositionData && positionStats.avgPositionSize > 0 && (
                  <div className="flex-1">
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg size</div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                      <span className="font-mono text-xl font-semibold tabular-nums leading-tight text-foreground">
                        {formatMoney(positionStats.avgPositionSize, "")}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">USDT</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Warning */}
            {positionStats.hasMissingTimestamps && (
              <div className="py-3 text-xs text-warning">
                Some trades have missing timestamps. Hold time statistics are hidden.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
