import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HowBacktestsWorkLink } from "@/components/HowBacktestsWorkLink";
import { formatDateTime } from "@/lib/format";

interface SharedBacktestHeaderProps {
  asset: string;
  timeframe: string;
  dateFrom: string;
  dateTo: string;
}

/** Header for the public Shared backtest page (ADR-0017: linked from every result). */
export function SharedBacktestHeader({
  asset,
  timeframe,
  dateFrom,
  dateTo,
}: SharedBacktestHeaderProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              Shared Backtest Results
            </h1>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="data-text">{asset}</Badge>
            <Badge variant="secondary" className="data-text">{timeframe}</Badge>
          </div>
        </div>
        <p className="data-text text-sm text-muted-foreground">
          {formatDateTime(dateFrom, "utc").split(" ")[0]} →{" "}
          {formatDateTime(dateTo, "utc").split(" ")[0]}
        </p>
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400">
          Strategy logic is not shared. Only performance metrics and equity
          curve are visible.
        </div>
        <div className="mt-3">
          <HowBacktestsWorkLink />
        </div>
      </CardContent>
    </Card>
  );
}
