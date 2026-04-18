import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BacktestStatus } from "@/types/backtest";

export const STATUS_BADGE: Record<
  BacktestStatus,
  { className: string; label: string }
> = {
  completed: {
    className: "border-success/30 text-success bg-green-500/5",
    label: "Completed",
  },
  running: {
    className: "border-info/30 text-info bg-blue-500/5",
    label: "Running",
  },
  pending: {
    className: "border-warning/30 text-warning bg-yellow-500/5",
    label: "Queued",
  },
  failed: {
    className: "border-destructive/30 text-destructive bg-destructive/5",
    label: "Failed",
  },
  skipped: {
    className: "border-border text-muted-foreground bg-muted",
    label: "Skipped",
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
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      )}
      {style.label}
    </Badge>
  );
}
