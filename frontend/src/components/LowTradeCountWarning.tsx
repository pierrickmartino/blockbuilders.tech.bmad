"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

interface LowTradeCountWarningProps {
  numTrades: number | undefined | null;
  userId?: string;
}

export function LowTradeCountWarning({ numTrades, userId }: LowTradeCountWarningProps) {
  const trackedRef = useRef<number | null>(null);

  useEffect(() => {
    if (numTrades == null || numTrades <= 0 || numTrades >= 10) return;
    if (trackedRef.current === numTrades) return;
    trackedRef.current = numTrades;
    trackEvent("health_warning_shown", { warning_type: "low_trade_count", num_trades: numTrades }, userId);
  }, [numTrades, userId]);

  if (numTrades == null || !Number.isFinite(numTrades) || numTrades <= 0 || numTrades >= 10) {
    return null;
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400">
      Your strategy triggered {numTrades} trade{numTrades !== 1 ? "s" : ""} over this period. With
      so few trades, results can vary a lot — try a longer date range or looser entry conditions to
      get more data points.
    </div>
  );
}
