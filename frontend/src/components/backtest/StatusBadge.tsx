import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BacktestStatus } from "@/types/backtest";

export const STATUS_BADGE: Record<
  BacktestStatus,
  { className: string; label: string }
> = {
  completed: {
    className: "border-success/30 bg-success/5 text-success",
    label: "Completed",
  },
  running: {
    className: "border-info/30 bg-info/5 text-info",
    label: "Running",
  },
  pending: {
    className: "border-warning/30 bg-warning/5 text-warning",
    label: "Queued",
  },
  failed: {
    className: "border-destructive/30 bg-destructive/5 text-destructive",
    label: "Failed",
  },
  skipped: {
    className: "border-border bg-muted text-muted-foreground",
    label: "Skipped",
  },
  cancelled: {
    className: "border-border bg-muted text-muted-foreground",
    label: "Cancelled",
  },
};

interface StatusBadgeProps {
  status: BacktestStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = STATUS_BADGE[status] ?? STATUS_BADGE.skipped;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 px-2 py-0.5 text-xs font-medium", style.className, className)}
    >
      {status === "running" ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      )}
      {style.label}
    </Badge>
  );
}
