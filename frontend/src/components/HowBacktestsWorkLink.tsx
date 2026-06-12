import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HowBacktestsWorkLinkProps {
  className?: string;
}

/**
 * Shared "How backtests work →" link to the public trust page
 * (`/how-backtests-work`). Placed on every result surface — the in-app
 * result page, the compare page, and the public Shared backtest — per
 * ADR-0017.
 */
export function HowBacktestsWorkLink({ className }: HowBacktestsWorkLinkProps) {
  return (
    <Link
      href="/how-backtests-work"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring rounded-sm",
        className
      )}
    >
      How backtests work
      <ArrowRight className="h-3 w-3" aria-hidden="true" />
    </Link>
  );
}
