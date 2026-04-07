import type { BacktestStatus } from "@/types/backtest";

export const PERIOD_LABEL: Record<string, string> = {
  "30d": "30 days",
  "60d": "60 days",
  "90d": "90 days",
  "120d": "120 days",
  "1y": "1 year",
  "2y": "2 years",
  "3y": "3 years",
};

// Status badge styling aligned with design-system.pen (Signal variant).
// Uses a 5% tinted fill with matching colored text + dot indicator, cornerRadius 4.
export const statusStyles: Record<BacktestStatus, string> = {
  pending: "bg-amber-500/5 text-amber-600 dark:text-amber-400",
  running: "bg-sky-500/5 text-sky-600 dark:text-sky-400",
  completed: "bg-green-600/5 text-green-600 dark:text-green-500",
  failed: "bg-red-600/5 text-red-600 dark:text-red-500",
  skipped: "bg-muted text-muted-foreground",
};
