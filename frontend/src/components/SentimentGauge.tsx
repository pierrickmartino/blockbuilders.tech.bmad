import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SentimentGaugeProps {
  label: string;
  helpText?: string;
  value: number | null;
  min: number;
  max: number;
  status: "ok" | "partial" | "unavailable";
  formatter?: (v: number) => string;
  unit?: string;
  subtext?: string;
  size?: "hero" | "default";
}

function gaugeColor(pct: number): string {
  if (pct <= 25) return "bg-destructive";
  if (pct <= 45) return "bg-warning";
  if (pct <= 55) return "bg-primary";
  if (pct <= 75) return "bg-success";
  return "bg-success";
}

export function SentimentGauge({
  label,
  helpText,
  value,
  min,
  max,
  status,
  formatter = (v) => v.toFixed(0),
  unit,
  subtext,
  size = "default",
}: SentimentGaugeProps) {
  const isHero = size === "hero";
  const pad = isHero ? "p-4" : "p-3";

  if (status === "unavailable") {
    return (
      <div className={pad}>
        <div className="mb-2 text-sm font-medium text-muted-foreground">{label}</div>
        <Badge variant="outline" className="text-xs">Source unavailable</Badge>
      </div>
    );
  }

  const range = max - min;
  const percentage = range > 0 && value !== null ? ((value - min) / range) * 100 : 0;
  const clampedPct = Math.max(0, Math.min(100, percentage));
  const displayValue = value !== null ? formatter(value) : "No score";

  return (
    <div className={`${pad}${status === "partial" ? " opacity-80" : ""}`}>
      <div className="mb-2 flex min-w-0 items-center gap-2 text-sm font-semibold">
        <span className="min-w-0 break-words">{label}</span>
        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 shrink-0 cursor-help text-muted-foreground" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {status === "partial" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs">Partial source</Badge>
              </TooltipTrigger>
              <TooltipContent>Some source data may be incomplete or delayed.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {isHero ? (
        <div className="mb-3">
          <span className="data-text text-3xl font-bold leading-none">{displayValue}</span>
          {subtext && (
            <p className="mt-1 text-sm font-semibold text-foreground">{subtext}</p>
          )}
        </div>
      ) : (
        <div className="mb-2">
          <span className="data-text text-lg font-semibold">{displayValue}</span>
          {subtext && (
            <span className="ml-2 text-xs text-muted-foreground">{subtext}</span>
          )}
        </div>
      )}

      <div
        className={`w-full rounded-full bg-muted ${isHero ? "h-2.5" : "h-2"}`}
        role="meter"
        aria-label={label}
        aria-valuenow={value ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={displayValue}
      >
        <div
          className={`${gaugeColor(clampedPct)} rounded-full transition-all ${isHero ? "h-2.5" : "h-2"}`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>

      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{min}{unit ? ` ${unit}` : ""}</span>
        <span>{max}{unit ? ` ${unit}` : ""}</span>
      </div>
    </div>
  );
}
