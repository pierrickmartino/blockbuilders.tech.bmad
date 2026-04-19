"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { SlidersHorizontal, Check } from "lucide-react";
import { useState } from "react";

interface PeriodOption {
  value: string;
  label: string;
  days: number | null;
  premiumOnly: boolean;
}

interface RunConfigProps {
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

export function RunConfig({
  periods,
  selectedPeriods,
  onTogglePeriod,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  feeRate,
  slippageRate,
  onFeeRateChange,
  onSlippageRateChange,
  isPremiumUser,
  isBetaGrandfatheredUser,
  forceRefreshPrices,
  onForceRefreshChange,
  availabilityWarning,
}: RunConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="rounded border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
        <div className="space-y-0.5">
          <h2 className="text-[15px] font-semibold">Run configuration</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pick periods, fees and slippage for this run
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <SlidersHorizontal className="h-3 w-3" />
          Advanced
        </button>
      </div>

      {/* Body */}
      <div className="space-y-4 px-4 py-5 sm:px-5">
        {/* Period presets label */}
        <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Period presets
        </div>

        {/* Chip row */}
        <div className="flex flex-wrap gap-2">
          {periods.map((option) => {
            const isSelected = selectedPeriods.has(option.value);
            const isDisabled = option.premiumOnly && !isPremiumUser;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => !isDisabled && onTogglePeriod(option.value, !isSelected)}
                disabled={isDisabled}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[11px] font-medium transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  isDisabled && "cursor-not-allowed opacity-50"
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
                {option.label}
                {option.premiumOnly && !isPremiumUser && (
                  <span className="text-[9px] opacity-70">PRO</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Inputs row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground" htmlFor="cfg-date-from">
              Start date
            </label>
            <Input
              id="cfg-date-from"
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground" htmlFor="cfg-date-to">
              End date
            </label>
            <Input
              id="cfg-date-to"
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => onDateToChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground" htmlFor="cfg-fee">
              Fee %
            </label>
            <Input
              id="cfg-fee"
              type="number"
              step="0.0001"
              min="0"
              max="0.1"
              value={feeRate}
              onChange={(e) => onFeeRateChange(e.target.value)}
              placeholder="0.001"
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground" htmlFor="cfg-slippage">
              Slippage %
            </label>
            <Input
              id="cfg-slippage"
              type="number"
              step="0.0001"
              min="0"
              max="0.1"
              value={slippageRate}
              onChange={(e) => onSlippageRateChange(e.target.value)}
              placeholder="0.0005"
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Availability warning */}
        {availabilityWarning && (
          <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {availabilityWarning}
          </div>
        )}

        {/* Advanced section */}
        {showAdvanced && isBetaGrandfatheredUser && (
          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={forceRefreshPrices}
              onChange={(e) => onForceRefreshChange(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-border"
            />
            <span>
              Force refresh candle prices before running (Beta User).
              <span className="block text-muted-foreground">
                Re-fetches OHLCV for this exact period and overwrites cached values.
              </span>
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
