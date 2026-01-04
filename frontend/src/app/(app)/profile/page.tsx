"use client";

import { useState, useEffect } from "react";
import { useDisplay } from "@/context/display";
import { apiFetch, ApiError } from "@/lib/api";
import { ProfileResponse, UserUpdateRequest } from "@/types/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
        {error}
        <Button
          variant="link"
          onClick={() => window.location.reload()}
          className="ml-2 h-auto p-0 text-red-600 underline"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Profile</h1>
      <p className="mb-6 text-muted-foreground">
        Manage your preferences and see your current usage.
      </p>

      <div className="space-y-6">
        {/* Section A: Account */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Email: {profile?.email}</CardDescription>
          </CardHeader>
        </Card>

        {/* Section B: Backtest Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>Backtest Defaults</CardTitle>
            <CardDescription>
              These values will be pre-filled when creating new backtests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveDefaults} className="max-w-md space-y-4">
              {message && (
                <div
                  className={cn(
                    "rounded border p-3 text-sm",
                    message.type === "success"
                      ? "border-green-200 bg-green-50 text-green-600"
                      : "border-red-200 bg-red-50 text-red-600"
                  )}
                >
                  {message.text}
                </div>
              )}

              <div>
                <label
                  htmlFor="fee"
                  className="mb-2 block text-sm font-medium"
                >
                  Default Trading Fee (%)
                </label>
                <Input
                  id="fee"
                  type="number"
                  step={0.01}
                  min={0}
                  max={5}
                  value={feePercent}
                  onChange={(e) => setFeePercent(e.target.value)}
                  placeholder="e.g. 0.1"
                />
              </div>

              <div>
                <label
                  htmlFor="slippage"
                  className="mb-2 block text-sm font-medium"
                >
                  Default Slippage (%)
                </label>
                <Input
                  id="slippage"
                  type="number"
                  step={0.01}
                  min={0}
                  max={5}
                  value={slippagePercent}
                  onChange={(e) => setSlippagePercent(e.target.value)}
                  placeholder="e.g. 0.05"
                />
              </div>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Section C: Display Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Display Preferences</CardTitle>
            <CardDescription>
              All timestamps will be displayed in your selected timezone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="mb-2 block text-sm font-medium">
              Timezone
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={timezone === "local" ? "default" : "secondary"}
                onClick={() => handleTimezoneChange("local")}
              >
                Local
              </Button>
              <Button
                type="button"
                variant={timezone === "utc" ? "default" : "secondary"}
                onClick={() => handleTimezoneChange("utc")}
              >
                UTC
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section D: Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>
              Your current usage against account limits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
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
          </CardContent>
        </Card>
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
        : "bg-primary";

  const badgeVariant: "destructive" | "secondary" | "default" =
    state === "reached"
      ? "destructive"
      : state === "near"
        ? "secondary"
        : "default";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{title}</h3>
          <Badge variant={badgeVariant}>
            {used} / {limit}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-2 rounded-full transition-all", barColor)}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-muted-foreground">{helper}</p>

        {state === "reached" && (
          <p className="mt-2 text-sm text-red-600">
            You&apos;ve reached your limit. Try again after the daily reset.
          </p>
        )}

        {resetsAt && state !== "reached" && (
          <p className="mt-1 text-xs text-muted-foreground">
            Resets at {new Date(resetsAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
