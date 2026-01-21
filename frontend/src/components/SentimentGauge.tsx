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
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</div>
          <Badge variant="outline" className="text-xs">Unavailable</Badge>
        </CardContent>
      </Card>
    );
  }

  const percentage = value !== null ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</div>

        {/* Value display */}
        <div className="text-2xl font-bold mb-2">
          {value !== null ? formatter(value) : "—"}
        </div>

        {/* Simple progress bar gauge */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </CardContent>
    </Card>
  );
}
