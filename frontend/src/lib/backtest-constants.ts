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

export const statusStyles: Record<BacktestStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  running: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  skipped: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};
