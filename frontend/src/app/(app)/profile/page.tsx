"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDisplay } from "@/context/display";
import { getConsent, setConsent } from "@/lib/analytics";
import { apiFetch, ApiError, safeRedirect } from "@/lib/api";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ProfileSettingsSection } from "./profile-settings-section";
import { Strategy } from "@/types/strategy";
import {
  User,
  Settings,
  Palette,
  Globe,
  BarChart3,
  CreditCard,
  Zap,
  Check,
  Sparkles,
  Shield,
  Mail,
} from "lucide-react";

export default function ProfilePage() {
  const { timezone, setTimezone, theme, setTheme, nodeDisplayMode, setNodeDisplayMode } = useDisplay();
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
  const [analyticsConsent, setAnalyticsConsent] = useState<"accepted" | "declined" | null>(null);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [strategiesLoading, setStrategiesLoading] = useState(true);
  const [strategiesError, setStrategiesError] = useState<string | null>(null);
  const [initialFeePercent, setInitialFeePercent] = useState("");
  const [initialSlippagePercent, setInitialSlippagePercent] = useState("");
  const [prefsMessage, setPrefsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingStrategyToggleIds, setPendingStrategyToggleIds] = useState<Set<string>>(new Set());
  const [digestMessage, setDigestMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const digestRequestSeqRef = useRef(0);
  const committedDigestEnabledRef = useRef(true);
  const pendingStrategyToggleIdsRef = useRef(new Set<string>());

  useEffect(() => {
    setAnalyticsConsent(getConsent());
  }, []);

  const handleConsentChange = useCallback((accepted: boolean) => {
    setConsent(accepted);
    setAnalyticsConsent(accepted ? "accepted" : "declined");
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await apiFetch<ProfileResponse>("/users/me");
        setProfile(data);
        const fee = data.settings.default_fee_percent?.toString() ?? "";
        const slip = data.settings.default_slippage_percent?.toString() ?? "";
        setFeePercent(fee);
        setSlippagePercent(slip);
        setInitialFeePercent(fee);
        setInitialSlippagePercent(slip);
        if (data.settings.timezone_preference) {
          setTimezone(data.settings.timezone_preference);
        }
        if (data.settings.theme_preference) {
          setTheme(data.settings.theme_preference);
        }
        setDigestEnabled(data.settings.digest_email_enabled);
        committedDigestEnabledRef.current = data.settings.digest_email_enabled;
      } catch {
        setError("Couldn't load profile. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [setTimezone, setTheme]);

  useEffect(() => {
    async function fetchStrategies() {
      try {
        const data = await apiFetch<Strategy[]>("/strategies");
        setStrategies(data);
        setStrategiesError(null);
      } catch (err) {
        setStrategiesError(
          err instanceof ApiError ? err.message : "Couldn't load strategies"
        );
      } finally {
        setStrategiesLoading(false);
      }
    }
    fetchStrategies();
  }, []);

  // Auto-dismiss success banners after 4s
  useEffect(() => {
    if (message?.type !== "success") return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    if (digestMessage?.type !== "success") return;
    const t = setTimeout(() => setDigestMessage(null), 4000);
    return () => clearTimeout(t);
  }, [digestMessage]);
  useEffect(() => {
    if (!prefsMessage) return;
    const t = setTimeout(() => setPrefsMessage(null), 4000);
    return () => clearTimeout(t);
  }, [prefsMessage]);

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
      setInitialFeePercent(feePercent);
      setInitialSlippagePercent(slippagePercent);
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

  async function handleTimezoneChange(tz: "local" | "utc") {
    const previousTz = timezone;
    setTimezone(tz);
    try {
      const updated = await apiFetch<ProfileResponse>("/users/me", {
        method: "PUT",
        body: JSON.stringify({ timezone_preference: tz }),
      });
      setProfile(updated);
      setPrefsMessage({ type: "success", text: "Timezone saved" });
    } catch {
      setTimezone(previousTz);
      setPrefsMessage({ type: "error", text: "Couldn't save timezone — reverted" });
    }
  }

  async function handleThemeChange(newTheme: "system" | "light" | "dark") {
    const previousTheme = theme;
    setTheme(newTheme);
    try {
      const updated = await apiFetch<ProfileResponse>("/users/me", {
        method: "PUT",
        body: JSON.stringify({ theme_preference: newTheme }),
      });
      setProfile(updated);
      setPrefsMessage({ type: "success", text: "Theme saved" });
    } catch {
      setTheme(previousTheme);
      setPrefsMessage({ type: "error", text: "Couldn't save theme — reverted" });
    }
  }

  function handleNodeDisplayModeChange(mode: "compact" | "expanded") {
    setNodeDisplayMode(mode);
  }

  async function handleDigestGlobalToggle(enabled: boolean) {
    const requestSeq = ++digestRequestSeqRef.current;
    setDigestEnabled(enabled);
    setDigestMessage(null);

    try {
      const updated = await apiFetch<ProfileResponse>("/users/me", {
        method: "PUT",
        body: JSON.stringify({ digest_email_enabled: enabled }),
      });
      if (requestSeq !== digestRequestSeqRef.current) {
        return;
      }
      const persistedDigestEnabled = updated.settings.digest_email_enabled;
      committedDigestEnabledRef.current = persistedDigestEnabled;
      setProfile(updated);
      setDigestEnabled(persistedDigestEnabled);
      setDigestMessage({
        type: "success",
        text: persistedDigestEnabled ? "Digest emails enabled" : "Digest emails paused",
      });
    } catch (err) {
      if (requestSeq !== digestRequestSeqRef.current) {
        return;
      }
      setDigestEnabled(committedDigestEnabledRef.current);
      setDigestMessage({
        type: "error",
        text: err instanceof ApiError ? err.message : "Failed to update digest preference",
      });
    }
  }

  async function handleStrategyDigestToggle(strategyId: string, enabled: boolean) {
    if (pendingStrategyToggleIdsRef.current.has(strategyId)) {
      return;
    }

    const strategy = strategies.find((s) => s.id === strategyId);
    if (!strategy) {
      return;
    }

    const previousDigestEnabled = strategy.digest_email_enabled;
    pendingStrategyToggleIdsRef.current.add(strategyId);
    setPendingStrategyToggleIds((prev) => {
      const next = new Set(prev);
      next.add(strategyId);
      return next;
    });

    setStrategies((prev) =>
      prev.map((s) => (s.id === strategyId ? { ...s, digest_email_enabled: enabled } : s))
    );
    setDigestMessage(null);

    try {
      await apiFetch(`/strategies/${strategyId}`, {
        method: "PATCH",
        body: JSON.stringify({ digest_email_enabled: enabled }),
      });
    } catch (err) {
      setStrategies((prev) =>
        prev.map((s) =>
          s.id === strategyId ? { ...s, digest_email_enabled: previousDigestEnabled } : s
        )
      );
      setDigestMessage({
        type: "error",
        text: err instanceof ApiError ? err.message : "Failed to update strategy digest preference",
      });
    } finally {
      pendingStrategyToggleIdsRef.current.delete(strategyId);
      setPendingStrategyToggleIds((prev) => {
        const next = new Set(prev);
        next.delete(strategyId);
        return next;
      });
    }
  }

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
      safeRedirect(response.url);
    } catch (err) {
      setBillingError(
        err instanceof ApiError ? err.message : "Failed to start checkout"
      );
      setIsUpgrading(null);
    }
  }

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
      safeRedirect(response.url);
    } catch (err) {
      setBillingError(
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
      safeRedirect(response.url);
    } catch (err) {
      setBillingError(
        err instanceof ApiError ? err.message : "Failed to start checkout"
      );
      setIsPurchasingPack(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-2 h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
        <Button
          variant="link"
          onClick={() => window.location.reload()}
          className="ml-2 h-auto p-0 text-destructive underline"
        >
          Retry
        </Button>
      </div>
    );
  }

  const extraStrategySlots = profile?.settings.extra_strategy_slots || 0;
  const strategiesLimit =
    (profile?.usage.strategies.limit || 0) + extraStrategySlots;
  const strategiesUsed = profile?.usage.strategies.used || 0;
  const strategiesHelper =
    strategiesLimit > 0 && strategiesUsed >= strategiesLimit
      ? `Maximum saved strategies${
          extraStrategySlots ? ` (includes +${extraStrategySlots} purchased)` : ""
        }.`
      : `Save up to ${strategiesLimit} strategies${
          extraStrategySlots ? ` (includes +${extraStrategySlots} purchased)` : ""
        }.`;

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your preferences and see your current usage.
        </p>
      </div>

      {/* In-page section nav */}
      <nav
        aria-label="Profile sections"
        className="mb-6 flex flex-wrap gap-2 border-b pb-4 text-sm"
      >
        {[
          { href: "#account", label: "Account" },
          { href: "#defaults", label: "Defaults" },
          { href: "#display", label: "Display" },
          { href: "#digest", label: "Digest" },
          { href: "#privacy", label: "Privacy" },
          { href: "#usage", label: "Usage" },
          { href: "#credits", label: "Credits" },
          { href: "#billing", label: "Billing" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-md px-2.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="space-y-6">
        {/* Account */}
        <Card id="account">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Account</CardTitle>
            </div>
            <CardDescription>Email: {profile?.email}</CardDescription>
          </CardHeader>
          {profile?.settings.user_tier === "beta" && (
            <CardContent>
              <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <Badge variant="secondary" className="mb-1.5">
                    Beta User — Grandfathered Perks
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    +10 strategies and +50 backtests/day are already applied to your limits below.{" "}
                    <a href="#billing" className="font-medium text-primary underline">
                      20% off paid plans
                    </a>
                    .
                  </p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Backtest Defaults */}
        <Card id="defaults">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Backtest Defaults</CardTitle>
            </div>
            <CardDescription>
              These values will be pre-filled when creating new backtests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveDefaults} className="max-w-md space-y-4">
              {message && (
                <div
                  role="status"
                  className={cn(
                    "flex items-start justify-between gap-2 rounded-lg border px-4 py-3 text-sm",
                    message.type === "success"
                      ? "border-success/30 bg-success/5 text-success"
                      : "border-destructive/30 bg-destructive/5 text-destructive"
                  )}
                >
                  <span>{message.text}</span>
                  <button
                    type="button"
                    onClick={() => setMessage(null)}
                    aria-label="Dismiss message"
                    className="shrink-0 opacity-70 hover:opacity-100"
                  >
                    ×
                  </button>
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

              <Button
                type="submit"
                disabled={
                  isSaving ||
                  (feePercent === initialFeePercent &&
                    slippagePercent === initialSlippagePercent)
                }
              >
                {isSaving ? "Saving..." : "Save Defaults"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Display Preferences */}
        <Card id="display">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Display Preferences</CardTitle>
            </div>
            <CardDescription>
              Customize how the app looks and feels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {prefsMessage && (
                <div
                  role="status"
                  className={cn(
                    "flex items-start justify-between gap-2 rounded-lg border px-4 py-3 text-sm",
                    prefsMessage.type === "success"
                      ? "border-success/30 bg-success/5 text-success"
                      : "border-destructive/30 bg-destructive/5 text-destructive"
                  )}
                >
                  <span>{prefsMessage.text}</span>
                  <button
                    type="button"
                    onClick={() => setPrefsMessage(null)}
                    aria-label="Dismiss message"
                    className="shrink-0 opacity-70 hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              )}

              <SegmentedGroup
                label="Timezone"
                value={timezone}
                onChange={(v) => handleTimezoneChange(v as "local" | "utc")}
                options={[
                  { value: "local", label: "Local" },
                  { value: "utc", label: "UTC" },
                ]}
              />

              <SegmentedGroup
                label="Theme"
                value={theme}
                onChange={(v) => handleThemeChange(v as "system" | "light" | "dark")}
                options={[
                  { value: "system", label: "System" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
              />

              <SegmentedGroup
                label="Node Display Mode"
                value={nodeDisplayMode}
                onChange={(v) => handleNodeDisplayModeChange(v as "compact" | "expanded")}
                options={[
                  { value: "compact", label: "Compact" },
                  { value: "expanded", label: "Expanded" },
                ]}
                helper="Compact mode shows one-line summaries. Click nodes to expand details."
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Digest Preferences */}
        <Card id="digest">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Email Digest Preferences</CardTitle>
            </div>
            <CardDescription>
              Control weekly strategy performance digest emails.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {digestMessage && (
                <div
                  role="status"
                  className={cn(
                    "flex items-start justify-between gap-2 rounded-lg border px-4 py-3 text-sm",
                    digestMessage.type === "success"
                      ? "border-success/30 bg-success/5 text-success"
                      : "border-destructive/30 bg-destructive/5 text-destructive"
                  )}
                >
                  <span>{digestMessage.text}</span>
                  <button
                    type="button"
                    onClick={() => setDigestMessage(null)}
                    aria-label="Dismiss message"
                    className="shrink-0 opacity-70 hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div id="digest-global-label" className="text-sm font-medium">
                    Weekly Strategy Digest
                  </div>
                  <p id="digest-global-desc" className="text-xs text-muted-foreground">
                    Receive a weekly summary of your strategy performance by email.
                  </p>
                </div>
                <Switch
                  id="digest-global"
                  checked={digestEnabled}
                  onCheckedChange={handleDigestGlobalToggle}
                  aria-labelledby="digest-global-label"
                  aria-describedby="digest-global-desc"
                />
              </div>

              {!digestEnabled && (
                <p className="text-xs text-muted-foreground">
                  All digest emails are paused. Per-strategy preferences below are saved for when you re-enable.
                </p>
              )}

              <div className="border-t pt-4">
                <h4 className="mb-3 text-sm font-medium">Per-Strategy Digest</h4>
                {strategiesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : strategiesError ? (
                  <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <span>Couldn&apos;t load strategies — {strategiesError}</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="h-auto p-0 text-destructive underline"
                    >
                      Retry
                    </Button>
                  </div>
                ) : strategies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No strategies yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {strategies.map((s) => {
                      const pending = pendingStrategyToggleIds.has(s.id);
                      const labelId = `digest-strategy-${s.id}`;
                      return (
                        <li
                          key={s.id}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition-opacity",
                            pending && "opacity-60"
                          )}
                        >
                          <label
                            id={labelId}
                            htmlFor={`digest-strategy-switch-${s.id}`}
                            className="min-w-0 flex-1 cursor-pointer truncate text-sm"
                          >
                            {s.name}
                          </label>
                          <Switch
                            id={`digest-strategy-switch-${s.id}`}
                            checked={s.digest_email_enabled}
                            disabled={pending}
                            onCheckedChange={(v) => handleStrategyDigestToggle(s.id, v)}
                            aria-labelledby={labelId}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Privacy */}
        <Card id="privacy">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Analytics Privacy</CardTitle>
            </div>
            <CardDescription>
              Control whether anonymous usage analytics are collected to help improve the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  Status:{" "}
                  <span className={cn(
                    analyticsConsent === "accepted"
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                  )}>
                    {analyticsConsent === "accepted" ? "Enabled" : analyticsConsent === "declined" ? "Disabled" : "Not set"}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No personal data is shared with third parties.
                </p>
              </div>
              {analyticsConsent === "accepted" ? (
                <Button variant="outline" size="sm" onClick={() => handleConsentChange(false)}>
                  Disable
                </Button>
              ) : (
                <Button size="sm" onClick={() => handleConsentChange(true)}>
                  Enable
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Public Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Public Profile</CardTitle>
            </div>
            <CardDescription>
              Make your profile visible to others and showcase your published
              strategies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileSettingsSection />
          </CardContent>
        </Card>

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
            <div className="grid gap-4 sm:grid-cols-2">
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
              <CardTitle className="text-base">Credits & Add-Ons</CardTitle>
            </div>
            <CardDescription>
              Purchase additional capacity on-demand without a subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {billingError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {billingError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="transition-shadow duration-200 hover:shadow-md">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">Backtest Credits</h3>
                    <Badge variant="default" className="tabular-nums">
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
                      : "Buy 50 Credits \u2013 $15"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="transition-shadow duration-200 hover:shadow-md">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">Extra Strategy Slots</h3>
                    <Badge variant="default" className="tabular-nums">
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
                      : "Buy +5 Slots \u2013 $9"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Billing */}
        <Card id="billing">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Billing & Plans</CardTitle>
            </div>
            <CardDescription>
              Manage your subscription and see available plans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {billingError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {billingError}
              </div>
            )}

            {/* Current Plan */}
            <div className="mb-6 rounded-lg border bg-muted/30 p-4">
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  recommended
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

function SegmentedGroup({
  label,
  value,
  onChange,
  options,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  helper?: string;
}) {
  const groupId = `seg-${label.replace(/\s+/g, "-").toLowerCase()}`;
  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const idx = options.findIndex((o) => o.value === value);
    const next =
      e.key === "ArrowRight"
        ? (idx + 1) % options.length
        : (idx - 1 + options.length) % options.length;
    onChange(options[next].value);
  }
  return (
    <div>
      <div id={`${groupId}-label`} className="mb-2.5 block text-sm font-medium">
        {label}
      </div>
      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        onKeyDown={handleKey}
        className="inline-flex rounded-lg border bg-muted/50 p-0.5"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {helper && <p className="mt-2 text-xs text-muted-foreground">{helper}</p>}
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
      ? "bg-gradient-to-r from-red-500 to-red-400"
      : state === "near"
        ? "bg-gradient-to-r from-yellow-500 to-yellow-400"
        : "bg-gradient-to-r from-primary to-primary/80";

  const badgeVariant: "destructive" | "secondary" | "default" =
    state === "reached"
      ? "destructive"
      : state === "near"
        ? "secondary"
        : "default";

  return (
    <Card className={cn(
      "transition-shadow duration-200",
      state === "reached" && "border-destructive/30"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{title}</h3>
          <Badge variant={badgeVariant} className="tabular-nums">
            {used} / {limit}
          </Badge>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-2 rounded-full transition-all duration-500", barColor)}
            style={{ width: `${Math.min(percent, 100)}%` }}
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
  recommended = false,
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
  recommended?: boolean;
  onUpgrade?: () => void;
  onUpgradeAnnual?: () => void;
  isUpgrading?: boolean;
}) {
  return (
    <Card className={cn(
      "relative transition-shadow duration-200",
      current && "border-primary/30",
      recommended && "border-primary shadow-md shadow-primary/5"
    )}>
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground shadow-sm">
            Popular
          </Badge>
        </div>
      )}
      <CardContent className={cn("p-5", recommended && "pt-6")}>
        <h3 className="mb-1 text-lg font-semibold tracking-tight">{name}</h3>
        <div className="mb-4">
          <span className="text-3xl font-bold tabular-nums tracking-tight">{price}</span>
          <span className="text-sm text-muted-foreground">/{interval}</span>
          {annualPrice && (
            <div className="mt-1">
              <p className="text-xs text-muted-foreground">or {annualPrice}</p>
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                Save 2 months
              </p>
            </div>
          )}
        </div>
        <ul className="mb-5 space-y-2 text-sm">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
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
                variant="outline"
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
