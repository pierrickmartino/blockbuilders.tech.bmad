"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch, ApiError, safeRedirect } from "@/lib/api";
import { toast } from "sonner";
import { ProfileResponse } from "@/types/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BarChart3, CreditCard, Zap } from "lucide-react";

export default function PlanPage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [isPurchasingPack, setIsPurchasingPack] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ProfileResponse>("/users/me");
      setProfile(data);
    } catch {
      setError("Couldn't load your plan details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleUpgrade(
    tier: "pro" | "premium",
    interval: "monthly" | "annual"
  ) {
    if (isUpgrading || isPurchasingPack) return;
    setIsUpgrading(`${tier}-${interval}`);

    try {
      const response = await apiFetch<{ url: string }>(
        "/billing/checkout-session",
        {
          method: "POST",
          body: JSON.stringify({ plan_tier: tier, interval }),
        }
      );
      safeRedirect(response.url);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to start checkout"
      );
      setIsUpgrading(null);
    }
  }

  async function handleManageBilling() {
    if (isUpgrading || isPurchasingPack) return;
    setIsUpgrading("portal");

    try {
      const response = await apiFetch<{ url: string }>(
        "/billing/portal-session",
        { method: "POST" }
      );
      safeRedirect(response.url);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Failed to open billing portal"
      );
      setIsUpgrading(null);
    }
  }

  async function handlePurchasePack(
    pack: "backtest_credits" | "strategy_slots"
  ) {
    if (isPurchasingPack || isUpgrading) return;
    setIsPurchasingPack(pack);

    try {
      const response = await apiFetch<{ url: string }>(
        "/billing/credit-pack/checkout-session",
        {
          method: "POST",
          body: JSON.stringify({ pack }),
        }
      );
      safeRedirect(response.url);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to start checkout"
      );
      setIsPurchasingPack(null);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-4 md:p-6">
        <div className="mb-6">
          <Skeleton className="mb-2 h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="mb-6">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl p-4 md:p-6">
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="min-w-0 break-words">{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProfile}
            className="min-h-11 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 sm:min-h-0"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const extraStrategySlots = profile?.settings.extra_strategy_slots ?? 0;
  const strategiesLimit =
    (profile?.usage.strategies.limit ?? 0) + extraStrategySlots;
  const strategiesUsed = profile?.usage.strategies.used ?? 0;
  const strategiesHelper =
    strategiesLimit <= 0
      ? "No saved strategy limit is configured for this account."
      : strategiesUsed >= strategiesLimit
        ? `Maximum saved strategies${
            extraStrategySlots
              ? ` (includes +${extraStrategySlots} purchased)`
              : ""
          }.`
        : `Save up to ${strategiesLimit} strategies${
            extraStrategySlots
              ? ` (includes +${extraStrategySlots} purchased)`
              : ""
          }.`;

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Usage &amp; Plan</h1>
        <p className="mt-1 text-muted-foreground">
          Monitor your limits and manage your subscription.
        </p>
      </div>

      <div className="space-y-6">
        {/* Usage */}
        <Card id="usage">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Usage</CardTitle>
            </div>
            <CardDescription>
              Your current usage against account limits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {profile && (
                <>
                  <UsageCard
                    title="Strategies"
                    used={profile.usage.strategies.used}
                    limit={strategiesLimit}
                    helper={strategiesHelper}
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

        {/* Credits & Add-Ons */}
        <Card id="credits">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Credits &amp; Add-Ons</CardTitle>
            </div>
            <CardDescription>
              Purchase additional capacity on-demand without a subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                  <h3 className="font-semibold">Backtest Credits</h3>
                  <Badge variant="default" className="font-mono tabular-nums">
                    {profile?.settings.backtest_credit_balance ?? 0} credits
                  </Badge>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Run backtests after your daily limit. Each credit = 1
                  backtest. Never expire.
                </p>
                <Button
                  onClick={() => handlePurchasePack("backtest_credits")}
                  disabled={Boolean(isPurchasingPack || isUpgrading)}
                  className="min-h-11 w-full sm:min-h-0"
                >
                  {isPurchasingPack === "backtest_credits"
                    ? "Loading..."
                    : "Buy 50 Credits — $15"}
                </Button>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                  <h3 className="font-semibold">Extra Strategy Slots</h3>
                  <Badge variant="default" className="font-mono tabular-nums">
                    +{profile?.settings.extra_strategy_slots ?? 0} slots
                  </Badge>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Permanently increase max strategies by 5. Stacks with plan
                  limit.
                </p>
                <Button
                  onClick={() => handlePurchasePack("strategy_slots")}
                  disabled={Boolean(isPurchasingPack || isUpgrading)}
                  className="min-h-11 w-full sm:min-h-0"
                >
                  {isPurchasingPack === "strategy_slots"
                    ? "Loading..."
                    : "Buy +5 Slots — $9"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing */}
        <Card id="billing">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Billing &amp; Plans</CardTitle>
            </div>
            <CardDescription>
              Manage your subscription and see available plans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Current Plan */}
            <div className="mb-6 rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold capitalize">
                    {profile?.plan.tier} Plan
                  </h3>
                  {profile?.plan.interval && (
                    <p className="text-sm text-muted-foreground">
                      Billed{" "}
                      {profile.plan.interval === "annual"
                        ? "annually"
                        : "monthly"}
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
                      disabled={Boolean(isUpgrading || isPurchasingPack)}
                      className="min-h-11 sm:min-h-0"
                    >
                      {isUpgrading === "portal"
                        ? "Loading..."
                        : "Manage Billing"}
                    </Button>
                  )}
              </div>
            </div>

            {/* Upgrade options — shown only to free users */}
            {profile?.plan.tier === "free" && (
              <div className="space-y-3">
                {/* Free-tier baseline — anchors the comparison */}
                <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Your current Free plan includes:
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="font-mono tabular-nums font-medium text-foreground">
                      {profile.usage.strategies.limit}
                    </span>{" "}
                    strategies ·{" "}
                    <span className="font-mono tabular-nums font-medium text-foreground">
                      {profile.usage.backtests_today.limit}
                    </span>{" "}
                    backtests/day · 1 year of historical data
                  </p>
                </div>

                {/* Pro — featured */}
                <div className="rounded-lg border-2 border-primary bg-primary/5 p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-base font-semibold">Pro</h3>
                        <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                          Most popular
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-2xl font-bold tabular-nums">
                          $19
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /month
                        </span>
                      </div>
                    </div>
                    <div className="text-sm sm:text-right">
                      <p className="text-muted-foreground">Annual billing:</p>
                      <p className="font-mono font-medium tabular-nums">$190/year</p>
                      <p className="text-xs font-medium text-success">
                        Save 2 months
                      </p>
                    </div>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    50 strategies · 200 backtests/day · 3 years of historical
                    data
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={() => handleUpgrade("pro", "monthly")}
                      disabled={Boolean(
                        isPurchasingPack || isUpgrading?.startsWith("pro")
                      )}
                      className="flex-1"
                    >
                      {isUpgrading?.startsWith("pro")
                        ? "Loading..."
                        : "Upgrade Monthly"}
                    </Button>
                    <Button
                      onClick={() => handleUpgrade("pro", "annual")}
                      disabled={Boolean(
                        isPurchasingPack || isUpgrading?.startsWith("pro")
                      )}
                      variant="outline"
                      className="flex-1 border-primary/30 hover:border-primary"
                    >
                      {isUpgrading?.startsWith("pro")
                        ? "Loading..."
                        : "Annual · Save 2 months"}
                    </Button>
                  </div>
                </div>

                {/* Premium — secondary */}
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Premium</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        200 strategies · 500 backtests/day · 10 years of
                        historical data
                      </p>
                    </div>
                    <div className="shrink-0 text-sm sm:text-right">
                      <span className="font-mono font-semibold tabular-nums">$49</span>
                      <span className="text-xs text-muted-foreground">
                        /month
                      </span>
                      <p className="text-xs text-muted-foreground">
                        or{" "}
                        <span className="font-mono tabular-nums">$490</span>
                        /year · save 2 months
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpgrade("premium", "monthly")}
                      disabled={Boolean(
                        isPurchasingPack ||
                          isUpgrading?.startsWith("premium")
                      )}
                      className="flex-1"
                    >
                      {isUpgrading?.startsWith("premium")
                        ? "Loading..."
                        : "Monthly"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpgrade("premium", "annual")}
                      disabled={Boolean(
                        isPurchasingPack ||
                          isUpgrading?.startsWith("premium")
                      )}
                      className="flex-1"
                    >
                      {isUpgrading?.startsWith("premium")
                        ? "Loading..."
                        : "Annual · $490/year"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Private sub-components
// ---------------------------------------------------------------------------

interface UsageCardProps {
  title: string;
  used: number;
  limit: number;
  helper: string;
  resetsAt?: string;
}

function UsageCard({ title, used, limit, helper, resetsAt }: UsageCardProps) {
  const safeUsed = Number.isFinite(used) ? Math.max(0, used) : 0;
  const safeLimit = Number.isFinite(limit) ? Math.max(0, limit) : 0;
  const percent = safeLimit > 0 ? (safeUsed / safeLimit) * 100 : 0;
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const state =
    percent >= 100 ? "reached" : percent >= 80 ? "near" : "normal";
  const resetLabel = formatResetDate(resetsAt);

  const barColor =
    state === "reached"
      ? "bg-destructive"
      : state === "near"
        ? "bg-warning"
        : "bg-primary";

  const badgeVariant: "destructive" | "secondary" | "default" =
    state === "reached"
      ? "destructive"
      : state === "near"
        ? "secondary"
        : "default";

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/20 p-4",
        state === "reached" && "border-destructive/30"
      )}
    >
      <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
        <h3 className="font-medium">{title}</h3>
        <Badge variant={badgeVariant} className="font-mono tabular-nums">
          {safeUsed} / {safeLimit || "No limit"}
        </Badge>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-2 rounded-full transition-all duration-normal",
            barColor
          )}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{helper}</p>

      {state === "reached" && (
        <p className="mt-2 text-sm text-destructive">
          You&apos;ve reached your limit.{" "}
          <a href="#billing" className="underline">
            Upgrade your plan
          </a>{" "}
          for higher limits.
        </p>
      )}

      {resetLabel && state !== "reached" && (
        <p className="mt-1 text-xs text-muted-foreground">
          Resets at {resetLabel}
        </p>
      )}
    </div>
  );
}

function formatResetDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
