import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SentimentGaugeProps {
  label: string;
  value: number | null;
  min: number;
  max: number;
  status: "ok" | "partial" | "unavailable";
  formatter?: (v: number) => string;
  unit?: string;
}

function gaugeColor(pct: number): string {
  if (pct <= 25) return "bg-destructive";
  if (pct <= 45) return "bg-warning";
  if (pct <= 55) return "bg-primary";
  if (pct <= 75) return "bg-primary";
  return "bg-success";
}

export function SentimentGauge({
  label,
  value,
  min,
  max,
  status,
  formatter = (v) => v.toFixed(0),
  unit,
}: SentimentGaugeProps) {
  if (status === "unavailable") {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 text-sm font-medium text-muted-foreground">{label}</div>
          <Badge variant="outline" className="text-xs">Unavailable</Badge>
        </CardContent>
      </Card>
    );
  }

  const range = max - min;
  const percentage = range > 0 && value !== null ? ((value - min) / range) * 100 : 0;
  const clampedPct = Math.max(0, Math.min(100, percentage));
  const displayValue = value !== null ? formatter(value) : "—";

  return (
    <Card className={status === "partial" ? "opacity-80 border-dashed" : undefined}>
      <CardContent className="p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          {label}
          {status === "partial" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs">Partial</Badge>
                </TooltipTrigger>
                <TooltipContent>Data may be incomplete or delayed</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Value display */}
        <div className="text-lg font-semibold mb-2">
          {displayValue}
        </div>

        {/* Gauge bar */}
        <div
          className="h-2 w-full rounded-full bg-muted"
          role="meter"
          aria-label={label}
          aria-valuenow={value ?? undefined}
          aria-valuemin={min}
          aria-valuemax={max}
        >
          <div
            className={`${gaugeColor(clampedPct)} h-2 rounded-full transition-all`}
            style={{ width: `${clampedPct}%` }}
          />
        </div>

        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{min}{unit ? ` ${unit}` : ""}</span>
          <span>{max}{unit ? ` ${unit}` : ""}</span>
        </div>
      </CardContent>
    </Card>
  );
}
