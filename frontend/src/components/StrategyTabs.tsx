import Link from "next/link";
import { cn } from "@/lib/utils";

interface StrategyTabsProps {
  strategyId: string;
  activeTab: "build" | "backtest" | "history" | "settings";
}

const tabs = [
  { key: "build" as const, label: "Builder", href: (id: string) => `/strategies/${id}` },
  { key: "backtest" as const, label: "Backtest", href: (id: string) => `/strategies/${id}/backtest` },
  { key: "history" as const, label: "History", href: (id: string) => `/strategies/${id}/history` },
  { key: "settings" as const, label: "Settings", href: (id: string) => `/strategies/${id}/settings` },
];

export function StrategyTabs({ strategyId, activeTab }: StrategyTabsProps) {
  return (
    <div
      role="tablist"
      className="flex h-[52px] items-end border-b border-border bg-card px-4 sm:px-8"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href(strategyId)}
          role="tab"
          aria-selected={activeTab === tab.key}
          className={cn(
            "inline-flex items-center gap-2 px-4 pb-0 pt-0 h-full text-sm font-medium transition-colors",
            activeTab === tab.key
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
