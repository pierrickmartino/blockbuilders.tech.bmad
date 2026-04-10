import Link from "next/link";
import { cn } from "@/lib/utils";

interface StrategyTabsProps {
  strategyId: string;
  activeTab: "build" | "backtest";
}

const tabBaseClasses =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:opacity-80";

export function StrategyTabs({ strategyId, activeTab }: StrategyTabsProps) {
  return (
    <div
      role="tablist"
      className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground"
    >
      <Link
        href={`/strategies/${strategyId}`}
        role="tab"
        aria-selected={activeTab === "build"}
        className={cn(
          tabBaseClasses,
          activeTab === "build"
            ? "bg-background text-foreground shadow"
            : "hover:bg-background/50 hover:text-foreground"
        )}
      >
        Build
      </Link>
      <Link
        href={`/strategies/${strategyId}/backtest`}
        role="tab"
        aria-selected={activeTab === "backtest"}
        className={cn(
          tabBaseClasses,
          activeTab === "backtest"
            ? "bg-background text-foreground shadow"
            : "hover:bg-background/50 hover:text-foreground"
        )}
      >
        Backtest
      </Link>
    </div>
  );
}
