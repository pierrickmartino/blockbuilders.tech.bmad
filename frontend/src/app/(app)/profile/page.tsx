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
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [isPurchasingPack, setIsPurchasingPack] = useState<string | null>(null);

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

  // Handle upgrade click
  async function handleUpgrade(
    tier: "pro" | "premium",
    interval: "monthly" | "annual"
  ) {
    setIsUpgrading(`${tier}-${interval}`);
    setBillingError(null);

    try {
      const response = await apiFetch<{ url: string }>(
        "/billing/checkout-session",
        {
          method: "POST",
          body: JSON.stringify({ plan_tier: tier, interval }),
        }
      );
      window.location.href = response.url;
    } catch (err) {
      setBillingError(
        err instanceof ApiError ? err.message : "Failed to start checkout"
      );
      setIsUpgrading(null);
    }
  }

  // Handle manage billing click
  async function handleManageBilling() {
    setIsUpgrading("portal");
    setBillingError(null);

    try {
      const response = await apiFetch<{ url: string }>(
        "/billing/portal-session",
        {
          method: "POST",
        }
      );
      window.location.href = response.url;
    } catch (err) {
      setBillingError(
        err instanceof ApiError
          ? err.message
          : "Failed to open billing portal"
      );
      setIsUpgrading(null);
    }
  }

  // Handle credit pack purchase
  async function handlePurchasePack(
    pack: "backtest_credits" | "strategy_slots"
  ) {
    setIsPurchasingPack(pack);
    setBillingError(null);

    try {
      const response = await apiFetch<{ url: string }>(
        "/billing/credit-pack/checkout-session",
        {
          method: "POST",
          body: JSON.stringify({ pack }),
        }
      );
      window.location.href = response.url;
    } catch (err) {
      setBillingError(
        err instanceof ApiError ? err.message : "Failed to start checkout"
      );
      setIsPurchasingPack(null);
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
                    limit={
                      profile.usage.strategies.limit +
                      (profile.settings.extra_strategy_slots || 0)
                    }
                    helper={`Maximum saved strategies${
                      profile.settings.extra_strategy_slots
                        ? ` (includes +${profile.settings.extra_strategy_slots} purchased)`
                        : ""
                    }.`}
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

        {/* Section D.5: Credits & Add-Ons */}
        <Card>
          <CardHeader>
            <CardTitle>Credits & Add-Ons</CardTitle>
            <CardDescription>
              Purchase additional capacity on-demand without a subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {billingError && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {billingError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {/* Backtest Credits Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">Backtest Credits</h3>
                    <Badge variant="default">
                      {profile?.settings.backtest_credit_balance || 0} credits
                    </Badge>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Run backtests after your daily limit. Each credit = 1
                    backtest. Never expire.
                  </p>
                  <Button
                    onClick={() => handlePurchasePack("backtest_credits")}
                    disabled={isPurchasingPack === "backtest_credits"}
                    className="w-full"
                  >
                    {isPurchasingPack === "backtest_credits"
                      ? "Loading..."
                      : "Buy 50 Credits"}
                  </Button>
                </CardContent>
              </Card>

              {/* Strategy Slots Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">Extra Strategy Slots</h3>
                    <Badge variant="default">
                      +{profile?.settings.extra_strategy_slots || 0} slots
                    </Badge>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Permanently increase max strategies by 5. Stacks with plan
                    limit.
                  </p>
                  <Button
                    onClick={() => handlePurchasePack("strategy_slots")}
                    disabled={isPurchasingPack === "strategy_slots"}
                    className="w-full"
                  >
                    {isPurchasingPack === "strategy_slots"
                      ? "Loading..."
                      : "Buy +5 Slots"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Section E: Billing */}
        <Card id="billing">
          <CardHeader>
            <CardTitle>Billing & Plans</CardTitle>
            <CardDescription>
              Manage your subscription and see available plans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {billingError && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {billingError}
              </div>
            )}

            {/* Current Plan */}
            <div className="mb-6 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold capitalize">
                    {profile?.plan.tier} Plan
                  </h3>
                  {profile?.plan.interval && (
                    <p className="text-sm text-muted-foreground">
                      Billed {profile.plan.interval}ly
                    </p>
                  )}
                  {profile?.plan.status && (
                    <Badge
                      variant={
                        profile.plan.status === "active"
                          ? "default"
                          : "secondary"
                      }
                      className="mt-2"
                    >
                      {profile.plan.status}
                    </Badge>
                  )}
                </div>
                {profile?.plan.tier !== "free" &&
                  profile?.plan.status === "active" && (
                    <Button
                      variant="outline"
                      onClick={handleManageBilling}
                      disabled={isUpgrading === "portal"}
                    >
                      {isUpgrading === "portal"
                        ? "Loading..."
                        : "Manage Billing"}
                    </Button>
                  )}
              </div>
            </div>

            {/* Plan Comparison */}
            {profile?.plan.tier === "free" && (
              <div className="grid gap-4 md:grid-cols-3">
                <PlanCard
                  name="Free"
                  price="$0"
                  interval="forever"
                  features={[
                    "10 strategies",
                    "50 backtests/day",
                    "1 year history",
                  ]}
                  current={true}
                />
                <PlanCard
                  name="Pro"
                  price="$19"
                  interval="month"
                  annualPrice="$190/year"
                  features={[
                    "50 strategies",
                    "200 backtests/day",
                    "3 years history",
                  ]}
                  onUpgrade={() => handleUpgrade("pro", "monthly")}
                  onUpgradeAnnual={() => handleUpgrade("pro", "annual")}
                  isUpgrading={isUpgrading?.startsWith("pro")}
                />
                <PlanCard
                  name="Premium"
                  price="$49"
                  interval="month"
                  annualPrice="$490/year"
                  features={[
                    "200 strategies",
                    "500 backtests/day",
                    "10 years history",
                  ]}
                  onUpgrade={() => handleUpgrade("premium", "monthly")}
                  onUpgradeAnnual={() => handleUpgrade("premium", "annual")}
                  isUpgrading={isUpgrading?.startsWith("premium")}
                />
              </div>
            )}
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
            You&apos;ve reached your limit.{" "}
            <a href="#billing" className="underline">
              Upgrade your plan
            </a>{" "}
            for higher limits.
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

function PlanCard({
  name,
  price,
  interval,
  annualPrice,
  features,
  current = false,
  onUpgrade,
  onUpgradeAnnual,
  isUpgrading = false,
}: {
  name: string;
  price: string;
  interval: string;
  annualPrice?: string;
  features: string[];
  current?: boolean;
  onUpgrade?: () => void;
  onUpgradeAnnual?: () => void;
  isUpgrading?: boolean;
}) {
  return (
    <Card className={cn(current && "border-primary")}>
      <CardContent className="p-4">
        <h3 className="mb-2 text-lg font-semibold">{name}</h3>
        <div className="mb-4">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-sm text-muted-foreground">/{interval}</span>
          {annualPrice && (
            <p className="mt-1 text-xs text-muted-foreground">
              or {annualPrice}
            </p>
          )}
        </div>
        <ul className="mb-4 space-y-2 text-sm">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              {feature}
            </li>
          ))}
        </ul>
        {current ? (
          <Badge variant="secondary" className="w-full justify-center py-2">
            Current Plan
          </Badge>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={onUpgrade}
              disabled={isUpgrading}
              className="w-full"
            >
              {isUpgrading ? "Loading..." : "Upgrade Monthly"}
            </Button>
            {onUpgradeAnnual && (
              <Button
                onClick={onUpgradeAnnual}
                disabled={isUpgrading}
                variant="secondary"
                className="w-full"
              >
                {isUpgrading ? "Loading..." : "Upgrade Annual"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
