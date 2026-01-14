import Link from "next/link";
import { cn } from "@/lib/utils";

interface StrategyTabsProps {
  strategyId: string;
  activeTab: "build" | "backtest";
}

export function StrategyTabs({ strategyId, activeTab }: StrategyTabsProps) {
  return (
    <div className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
      <Link
        href={`/strategies/${strategyId}`}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          activeTab === "build"
            ? "bg-background text-foreground shadow"
            : "hover:bg-background/50 hover:text-foreground"
        )}
        aria-current={activeTab === "build" ? "page" : undefined}
      >
        Build
      </Link>
      <Link
        href={`/strategies/${strategyId}/backtest`}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          activeTab === "backtest"
            ? "bg-background text-foreground shadow"
            : "hover:bg-background/50 hover:text-foreground"
        )}
        aria-current={activeTab === "backtest" ? "page" : undefined}
      >
        Backtest
      </Link>
    </div>
  );
}
