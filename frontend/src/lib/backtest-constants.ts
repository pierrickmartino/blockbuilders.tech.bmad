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
// Light mode uses a 5% tint; dark mode uses a stronger 12.5% tint.
export const statusStyles: Record<BacktestStatus, string> = {
  pending:
    "bg-[hsl(var(--warning)/0.05)] text-warning dark:bg-[hsl(var(--warning)/0.125)] dark:text-warning",
  running:
    "bg-[hsl(var(--info)/0.05)] text-info dark:bg-[hsl(var(--info)/0.125)] dark:text-info",
  completed:
    "bg-[hsl(var(--success)/0.05)] text-success dark:bg-[hsl(var(--success)/0.125)] dark:text-success",
  failed:
    "bg-[hsl(var(--destructive)/0.05)] text-destructive dark:bg-[hsl(var(--destructive)/0.125)] dark:text-destructive",
  skipped: "bg-muted text-muted-foreground",
};
