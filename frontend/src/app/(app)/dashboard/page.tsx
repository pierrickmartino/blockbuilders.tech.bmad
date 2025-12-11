"use client";

import { useAuth } from "@/context/auth";

export default function DashboardPage() {
  const { user } = useAuth();

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

        <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-gray-500">
            No strategies yet. Strategy creation will be available in the next
            epic.
          </p>
        </div>
      </div>
    </div>
  );
}
