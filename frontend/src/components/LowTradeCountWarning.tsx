"use client";

import { useEffect, useRef } from "react";
import { PageAlert } from "@/components/ui/page-alert";
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
    <PageAlert variant="warning">
      Sample size: {numTrades} trade{numTrades !== 1 ? "s" : ""}. Below 10 trades, performance
      metrics are not statistically reliable — extend the date range or loosen entry conditions.
    </PageAlert>
  );
}
