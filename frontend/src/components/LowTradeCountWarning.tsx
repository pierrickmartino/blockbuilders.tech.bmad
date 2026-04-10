"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface LowTradeCountWarningProps {
  numTrades: number | undefined | null;
  runId?: string | null;
  userId?: string;
}

export function LowTradeCountWarning({ numTrades, runId, userId }: LowTradeCountWarningProps) {
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (numTrades == null || numTrades <= 0 || numTrades >= 10) return;
    const impressionKey = runId ?? `num_trades:${numTrades}`;
    if (trackedRef.current === impressionKey) return;
    trackedRef.current = impressionKey;
    trackEvent(
      "health_warning_shown",
      { warning_type: "low_trade_count", num_trades: numTrades, run_id: runId ?? undefined },
      userId
    );
  }, [numTrades, runId, userId]);

  if (numTrades == null || !Number.isFinite(numTrades) || numTrades <= 0 || numTrades >= 10) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Your strategy triggered {numTrades} trade{numTrades !== 1 ? "s" : ""} over this period. With
        so few trades, results can vary a lot — try a longer date range or looser entry conditions to
        get more data points.
      </span>
    </div>
  );
}
