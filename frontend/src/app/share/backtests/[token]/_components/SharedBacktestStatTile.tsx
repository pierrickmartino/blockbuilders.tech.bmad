import type { ReactNode } from "react";

interface SharedBacktestStatTileProps {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
}

/**
 * Bordered metric tile shared by the Performance Metrics grid and the Cost
 * Disclosure grid on the Shared backtest page — one source of truth for the
 * tile's spacing, border, and typography.
 */
export function SharedBacktestStatTile({
  label,
  value,
  caption,
}: SharedBacktestStatTileProps) {
  return (
    <div className="rounded-lg border bg-secondary/50 p-3 dark:bg-secondary/30">
      <div className="mb-1 text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums tracking-tight">
        {value}
      </div>
      {caption != null && (
        <div className="text-xs text-muted-foreground">{caption}</div>
      )}
    </div>
  );
}
