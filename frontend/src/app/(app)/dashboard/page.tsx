"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import { useDisplay } from "@/context/display";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Strategy } from "@/types/strategy";

export default function DashboardPage() {
  const { user } = useAuth();
  const { timezone } = useDisplay();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<Strategy[]>("/strategies/")
      .then(setStrategies)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const recentStrategies = strategies.slice(0, 5);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Welcome, {user?.email}
        </h2>
        <p className="text-gray-600">
          Your strategy workspace is ready. Start building your first backtest
          strategy.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Backtests are simulations using historical data.{" "}
          <Link
            href="/how-backtests-work"
            className="text-blue-600 hover:underline"
          >
            Learn about assumptions
          </Link>
          .
        </p>

        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Your Strategies</h3>
            <Link
              href="/strategies"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all &rarr;
            </Link>
          </div>

          {isLoading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : strategies.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-gray-500">
                No strategies yet.{" "}
                <Link href="/strategies" className="text-blue-600 hover:text-blue-800">
                  Create your first strategy
                </Link>{" "}
                to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentStrategies.map((strategy) => (
                <Link
                  key={strategy.id}
                  href={`/strategies/${strategy.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium text-gray-900">{strategy.name}</div>
                    <div className="text-sm text-gray-500">
                      {strategy.asset} &middot; {strategy.timeframe}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {formatDateTime(strategy.updated_at, timezone)}
                  </div>
                </Link>
              ))}
              {strategies.length > 5 && (
                <div className="pt-2 text-center text-sm text-gray-500">
                  +{strategies.length - 5} more strategies
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
