import Link from "next/link";

interface StrategyTabsProps {
  strategyId: string;
  activeTab: "build" | "backtest";
}

export function StrategyTabs({ strategyId, activeTab }: StrategyTabsProps) {
  const activeClasses = "rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700";
  const inactiveClasses = "rounded-full px-3 py-1 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900";

  return (
    <div className="mt-3 flex gap-2">
      <Link
        href={`/strategies/${strategyId}`}
        className={activeTab === "build" ? activeClasses : inactiveClasses}
        aria-current={activeTab === "build" ? "page" : undefined}
      >
        Build
      </Link>
      <Link
        href={`/strategies/${strategyId}/backtest`}
        className={activeTab === "backtest" ? activeClasses : inactiveClasses}
        aria-current={activeTab === "backtest" ? "page" : undefined}
      >
        Backtest
      </Link>
    </div>
  );
}
