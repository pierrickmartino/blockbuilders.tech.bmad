"use client";

import { useEffect, useRef } from "react";
import { Play } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RunConfig } from "@/components/backtest/RunConfig";

interface PeriodOption {
  value: string;
  label: string;
  days: number | null;
  premiumOnly: boolean;
}

interface RunConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void | Promise<void>;
  isSubmitting: boolean;
  periods: PeriodOption[];
  selectedPeriods: Set<string>;
  onTogglePeriod: (period: string, checked: boolean) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  feeRate: string;
  slippageRate: string;
  onFeeRateChange: (v: string) => void;
  onSlippageRateChange: (v: string) => void;
  isPremiumUser: boolean;
  isBetaGrandfatheredUser: boolean;
  forceRefreshPrices: boolean;
  onForceRefreshChange: (v: boolean) => void;
  availabilityWarning: string | null;
}

export function RunConfigSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  ...runConfigProps
}: RunConfigSheetProps) {
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);
  const selectedCount = runConfigProps.selectedPeriods.size;
  const disabled = isSubmitting || selectedCount === 0;

  const ctaLabel = isSubmitting
    ? "Starting…"
    : selectedCount === 0
      ? "Select at least one period"
      : selectedCount === 1
        ? "Run backtest"
        : `Run ${selectedCount} backtests`;

  // Cmd/Ctrl+Enter submits
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "Enter") {
        e.preventDefault();
        if (!disabled) {
          submitBtnRef.current?.click();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, disabled]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4 text-left">
          <SheetTitle>Run a backtest</SheetTitle>
          <SheetDescription>
            Pick periods, fees, and slippage. Press{" "}
            <kbd className="rounded border border-border bg-secondary px-1 font-mono text-[10px] text-foreground">
              ⌘↵
            </kbd>{" "}
            to run.
          </SheetDescription>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <RunConfig {...runConfigProps} chromeless />
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-card px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            ref={submitBtnRef}
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => onSubmit()}
            className="gap-2"
          >
            <Play className="h-3.5 w-3.5" />
            {ctaLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
