"use client";

import { useEffect, useRef } from "react";
import { Callout } from "@tremor/react";
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
    <Callout
      role="status"
      title={`Only ${numTrades} trade${numTrades !== 1 ? "s" : ""} triggered`}
      icon={AlertTriangle}
      color="yellow"
    >
      With so few trades, results can vary a lot — try a longer date range or looser entry conditions
      to get more data points.
    </Callout>
  );
}
