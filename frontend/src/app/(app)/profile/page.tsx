"use client";

import { useState, useEffect } from "react";
import { useDisplay } from "@/context/display";
import { apiFetch, ApiError } from "@/lib/api";
import { ProfileResponse, UserUpdateRequest } from "@/types/auth";

export default function ProfilePage() {
  const { timezone, setTimezone } = useDisplay();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [feePercent, setFeePercent] = useState("");
  const [slippagePercent, setSlippagePercent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Fetch profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await apiFetch<ProfileResponse>("/users/me");
        setProfile(data);
        setFeePercent(data.settings.default_fee_percent?.toString() ?? "");
        setSlippagePercent(data.settings.default_slippage_percent?.toString() ?? "");
        // Sync timezone from server to display context
        if (data.settings.timezone_preference) {
          setTimezone(data.settings.timezone_preference);
        }
      } catch {
        setError("Couldn't load profile. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [setTimezone]);

  // Handle backtest defaults save
  async function handleSaveDefaults(e: React.FormEvent) {
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
      const updated = await apiFetch<ProfileResponse>("/users/me", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setProfile(updated);
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

  // Handle timezone change (save to server)
  async function handleTimezoneChange(tz: "local" | "utc") {
    const previousTz = timezone;
    setTimezone(tz);
    try {
      const updated = await apiFetch<ProfileResponse>("/users/me", {
        method: "PUT",
        body: JSON.stringify({ timezone_preference: tz }),
      });
      setProfile(updated);
    } catch {
      // Revert on error
      setTimezone(previousTz);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
        {error}
        <button
          onClick={() => window.location.reload()}
          className="ml-4 text-sm underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Profile</h1>
      <p className="mb-6 text-gray-600">
        Manage your preferences and see your current usage.
      </p>

      <div className="space-y-6">
        {/* Section A: Account */}
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Account</h2>
          <p className="mt-1 text-sm text-gray-600">Email: {profile?.email}</p>
        </section>

        {/* Section B: Backtest Defaults */}
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Backtest Defaults</h2>
          <p className="mt-1 text-sm text-gray-600">
            These values will be pre-filled when creating new backtests.
          </p>

          <form onSubmit={handleSaveDefaults} className="mt-4 max-w-md space-y-4">
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
              {isSaving ? "Saving..." : "Save"}
            </button>
          </form>
        </section>

        {/* Section C: Display Preferences */}
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Display Preferences</h2>
          <p className="mt-1 text-sm text-gray-600">
            All timestamps will be displayed in your selected timezone.
          </p>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Timezone
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => handleTimezoneChange("local")}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  timezone === "local"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Local
              </button>
              <button
                type="button"
                onClick={() => handleTimezoneChange("utc")}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  timezone === "utc"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                UTC
              </button>
            </div>
          </div>
        </section>

        {/* Section D: Usage */}
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Usage</h2>
          <p className="mt-1 text-sm text-gray-600">
            Your current usage against account limits.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {profile && (
              <>
                <UsageCard
                  title="Strategies"
                  used={profile.usage.strategies.used}
                  limit={profile.usage.strategies.limit}
                  helper="Maximum saved strategies."
                />
                <UsageCard
                  title="Backtests (today)"
                  used={profile.usage.backtests_today.used}
                  limit={profile.usage.backtests_today.limit}
                  helper="Resets daily at 00:00 UTC."
                  resetsAt={profile.usage.backtests_today.resets_at_utc}
                />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function UsageCard({
  title,
  used,
  limit,
  helper,
  resetsAt,
}: {
  title: string;
  used: number;
  limit: number;
  helper: string;
  resetsAt?: string;
}) {
  const percent = limit > 0 ? (used / limit) * 100 : 0;
  const state = percent >= 100 ? "reached" : percent >= 80 ? "near" : "normal";

  const barColor =
    state === "reached"
      ? "bg-red-500"
      : state === "near"
        ? "bg-yellow-500"
        : "bg-blue-500";

  const badgeColor =
    state === "reached"
      ? "bg-red-100 text-red-700"
      : state === "near"
        ? "bg-yellow-100 text-yellow-700"
        : "bg-gray-100 text-gray-600";

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}>
          {used} / {limit}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-gray-500">{helper}</p>

      {state === "reached" && (
        <p className="mt-2 text-sm text-red-600">
          You&apos;ve reached your limit. Try again after the daily reset.
        </p>
      )}

      {resetsAt && state !== "reached" && (
        <p className="mt-1 text-xs text-gray-400">
          Resets at {new Date(resetsAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
