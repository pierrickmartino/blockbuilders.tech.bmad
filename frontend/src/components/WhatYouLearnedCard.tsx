"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatYouLearnedCardProps {
  strategyReturnPct: number;
  benchmarkReturnPct: number;
  asset: string;
  dateRange: string;
  onDismiss?: () => void;
}

export function WhatYouLearnedCard({
  strategyReturnPct,
  benchmarkReturnPct,
  asset,
  dateRange,
  onDismiss,
}: WhatYouLearnedCardProps) {
  const [exiting, setExiting] = useState(false);

  const delta = strategyReturnPct - benchmarkReturnPct;
  const absDelta = Math.abs(delta).toFixed(1);
  const isSmall = Math.abs(delta) < 1;

  let comparison: React.ReactNode;
  if (isSmall) {
    comparison = "Your strategy tracked buy-and-hold within 1 pp over this period.";
  } else {
    const verb = delta > 0 ? "outperformed" : "underperformed";
    const colorClass = delta > 0 ? "text-success" : "text-destructive";
    comparison = (
      <>
        Your strategy {verb} buy-and-hold by{" "}
        <span className={`font-semibold ${colorClass}`}>
          {absDelta} pp
        </span>{" "}
        over {dateRange}.
      </>
    );
  }

  const handleDismiss = () => {
    setExiting(true);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-1 py-1.5 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
        exiting ? "scale-95 opacity-0" : "scale-100 opacity-100"
      )}
      onTransitionEnd={() => {
        if (exiting) onDismiss?.();
      }}
    >
      <p className="min-w-0 flex-1 text-xs text-muted-foreground">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Insight
        </span>
        <span className="mx-2 text-muted-foreground/40">·</span>
        vs buy-and-hold{" "}
        <span className="font-medium text-foreground">{asset}</span>. {comparison}
      </p>

      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="flex flex-shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <Check className="h-3 w-3" />
          Got it
        </button>
      )}
    </div>
  );
}
