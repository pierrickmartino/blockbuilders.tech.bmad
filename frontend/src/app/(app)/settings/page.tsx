"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";
import { apiFetch, ApiError } from "@/lib/api";
import { User, UserUpdateRequest } from "@/types/auth";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [feePercent, setFeePercent] = useState("");
  const [slippagePercent, setSlippagePercent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      setFeePercent(user.default_fee_percent?.toString() ?? "");
      setSlippagePercent(user.default_slippage_percent?.toString() ?? "");
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setIsSaving(true);

    const data: UserUpdateRequest = {};
    if (feePercent !== "") {
      data.default_fee_percent = parseFloat(feePercent);
    }
    if (slippagePercent !== "") {
      data.default_slippage_percent = parseFloat(slippagePercent);
    }

    try {
      await apiFetch<User>("/users/me", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      await refreshUser();
      setMessage({ type: "success", text: "Settings saved successfully" });
    } catch (err) {
      if (err instanceof ApiError) {
        setMessage({ type: "error", text: err.message });
      } else {
        setMessage({ type: "error", text: "Failed to save settings" });
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Account Settings</h1>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Account Information
          </h2>
          <p className="mt-1 text-sm text-gray-600">Email: {user?.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Backtest Defaults
          </h2>
          <p className="text-sm text-gray-600">
            These values will be pre-filled when creating new backtests.
          </p>

          {message && (
            <div
              className={`rounded border p-3 text-sm ${
                message.type === "success"
                  ? "border-green-200 bg-green-50 text-green-600"
                  : "border-red-200 bg-red-50 text-red-600"
              }`}
            >
              {message.text}
            </div>
          )}

          <div>
            <label
              htmlFor="fee"
              className="block text-sm font-medium text-gray-700"
            >
              Default Trading Fee (%)
            </label>
            <input
              id="fee"
              type="number"
              step="0.01"
              min="0"
              max="5"
              value={feePercent}
              onChange={(e) => setFeePercent(e.target.value)}
              placeholder="e.g. 0.1"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="slippage"
              className="block text-sm font-medium text-gray-700"
            >
              Default Slippage (%)
            </label>
            <input
              id="slippage"
              type="number"
              step="0.01"
              min="0"
              max="5"
              value={slippagePercent}
              onChange={(e) => setSlippagePercent(e.target.value)}
              placeholder="e.g. 0.05"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
