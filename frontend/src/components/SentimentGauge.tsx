import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SentimentGaugeProps {
  label: string;
  value: number | null;
  min: number;
  max: number;
  status: "ok" | "partial" | "unavailable";
  formatter?: (v: number) => string;
}

export function SentimentGauge({
  label,
  value,
  min,
  max,
  status,
  formatter = (v) => v.toFixed(0),
}: SentimentGaugeProps) {
  if (status === "unavailable") {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="mb-2 text-sm font-medium text-muted-foreground">{label}</div>
          <Badge variant="outline" className="text-xs">Unavailable</Badge>
        </CardContent>
      </Card>
    );
  }

  const percentage = value !== null ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="mb-2 text-sm font-medium text-muted-foreground">{label}</div>

        {/* Value display */}
        <div className="text-2xl font-bold mb-2">
          {value !== null ? formatter(value) : "—"}
        </div>

        {/* Simple progress bar gauge */}
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </CardContent>
    </Card>
  );
}
