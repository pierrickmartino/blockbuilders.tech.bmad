"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDisplay } from "@/context/display";
import { getConsent, setConsent } from "@/lib/analytics";
import { apiFetch, ApiError, safeRedirect } from "@/lib/api";
import { toast } from "sonner";
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
  Sparkles,
  Shield,
  Mail,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "#account", label: "Account" },
  { href: "#public-profile", label: "Public Profile" },
  { href: "#defaults", label: "Defaults" },
  { href: "#display", label: "Display" },
  { href: "#digest", label: "Digest" },
  { href: "#privacy", label: "Privacy" },
  { href: "#usage", label: "Usage" },
  { href: "#credits", label: "Credits" },
  { href: "#billing", label: "Billing" },
];

export default function ProfilePage() {
  const { timezone, setTimezone, theme, setTheme, nodeDisplayMode, setNodeDisplayMode } = useDisplay();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [feePercent, setFeePercent] = useState("");
  const [slippagePercent, setSlippagePercent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultsErrors, setDefaultsErrors] = useState<{
    fee?: string;
    slippage?: string;
  }>({});
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [isPurchasingPack, setIsPurchasingPack] = useState<string | null>(null);
  const [analyticsConsent, setAnalyticsConsent] = useState<"accepted" | "declined" | null>(null);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [strategiesLoading, setStrategiesLoading] = useState(true);
  const [strategiesError, setStrategiesError] = useState<string | null>(null);
  const [initialFeePercent, setInitialFeePercent] = useState("");
  const [initialSlippagePercent, setInitialSlippagePercent] = useState("");
  const [pendingStrategyToggleIds, setPendingStrategyToggleIds] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string>("account");
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

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
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
  }, [setTimezone, setTheme]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const fetchStrategies = useCallback(async () => {
    setStrategiesLoading(true);
    setStrategiesError(null);
    try {
      const data = await apiFetch<Strategy[]>("/strategies");
      setStrategies(data);
    } catch (err) {
      setStrategiesError(
        err instanceof ApiError ? err.message : "Couldn't load strategies"
      );
    } finally {
      setStrategiesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  // Track active section for nav highlight
  useEffect(() => {
    if (isLoading) return;
    const sectionIds = NAV_ITEMS.map((item) => item.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => e.target.id);
        const first = sectionIds.find((id) => visible.includes(id));
        if (first) setActiveSection(first);
      },
      { rootMargin: "-10% 0px -80% 0px", threshold: 0 }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isLoading]);

  async function handleSaveDefaults(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors = {
      fee: validatePercentInput(feePercent, "fee"),
      slippage: validatePercentInput(slippagePercent, "slippage"),
    };
    setDefaultsErrors(nextErrors);

    if (nextErrors.fee || nextErrors.slippage) {
      toast.error("Check the highlighted defaults before saving.");
      return;
    }

    const data: UserUpdateRequest = {};
    data.default_fee_percent =
      feePercent.trim() === "" ? null : Number(feePercent);
    data.default_slippage_percent =
      slippagePercent.trim() === "" ? null : Number(slippagePercent);

    setIsSaving(true);

    try {
      const updated = await apiFetch<ProfileResponse>("/users/me", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setProfile(updated);
      const savedFee = updated.settings.default_fee_percent?.toString() ?? "";
      const savedSlippage =
        updated.settings.default_slippage_percent?.toString() ?? "";
      setFeePercent(savedFee);
      setSlippagePercent(savedSlippage);
      setInitialFeePercent(savedFee);
      setInitialSlippagePercent(savedSlippage);
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save settings");
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
      toast.success("Timezone saved");
    } catch {
      setTimezone(previousTz);
      toast.error("Couldn't save timezone, reverted");
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
      toast.success("Theme saved");
    } catch {
      setTheme(previousTheme);
      toast.error("Couldn't save theme, reverted");
    }
  }

  function handleNodeDisplayModeChange(mode: "compact" | "expanded") {
    setNodeDisplayMode(mode);
  }

  async function handleDigestGlobalToggle(enabled: boolean) {
    const requestSeq = ++digestRequestSeqRef.current;
    setDigestEnabled(enabled);

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
      toast.success(persistedDigestEnabled ? "Digest emails enabled" : "Digest emails paused");
    } catch (err) {
      if (requestSeq !== digestRequestSeqRef.current) {
        return;
      }
      setDigestEnabled(committedDigestEnabledRef.current);
      toast.error(err instanceof ApiError ? err.message : "Failed to update digest preference");
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
      toast.error(err instanceof ApiError ? err.message : "Failed to update strategy digest preference");
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
      toast.error(err instanceof ApiError ? err.message : "Failed to start checkout");
      setIsUpgrading(null);
    }
  }

  async function handleManageBilling() {
    if (isUpgrading || isPurchasingPack) return;
    setIsUpgrading("portal");

    try {
      const response = await apiFetch<{ url: string }>(
        "/billing/portal-session",
        {
          method: "POST",
        }
      );
      safeRedirect(response.url);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to open billing portal");
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
      toast.error(err instanceof ApiError ? err.message : "Failed to start checkout");
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
    );
  }

  const extraStrategySlots = profile?.settings.extra_strategy_slots || 0;
  const strategiesLimit =
    (profile?.usage.strategies.limit || 0) + extraStrategySlots;
  const strategiesUsed = profile?.usage.strategies.used || 0;
  const strategiesHelper =
    strategiesLimit <= 0
      ? "No saved strategy limit is configured for this account."
      : strategiesUsed >= strategiesLimit
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
        className="-mx-4 mb-6 overflow-x-auto border-b px-4 pb-4 text-sm md:mx-0 md:px-0"
      >
        <div className="flex min-w-max gap-1 md:flex-wrap">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.href.slice(1);
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-3 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring sm:min-h-0",
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </nav>

      <div className="space-y-6">
        {/* Account */}
        <Card id="account">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Account</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10"
                aria-hidden="true"
              >
                <span className="text-sm font-semibold text-primary">
                  {profile?.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="break-all text-sm font-medium">{profile?.email}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {profile?.plan.tier} plan
                </p>
              </div>
            </div>
            {profile?.settings.user_tier === "beta" && (
              <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <Badge variant="secondary" className="mb-1.5">
                    Beta User: Grandfathered Perks
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
            )}
          </CardContent>
        </Card>

        {/* Public Profile */}
        <Card id="public-profile">
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

        {/* Group separator */}
        <div className="flex items-center gap-3 py-2" aria-hidden="true">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">Preferences</span>
          <div className="h-px flex-1 bg-border" />
        </div>

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
                  inputMode="decimal"
                  step={0.01}
                  min={0}
                  max={5}
                  value={feePercent}
                  onChange={(e) => {
                    setFeePercent(e.target.value);
                    setDefaultsErrors((prev) => ({ ...prev, fee: undefined }));
                  }}
                  placeholder="e.g. 0.1"
                  aria-invalid={Boolean(defaultsErrors.fee)}
                  aria-describedby={defaultsErrors.fee ? "fee-error" : "fee-help"}
                />
                <p id="fee-help" className="mt-1 text-xs text-muted-foreground">
                  Leave blank to omit from backtests. Maximum 5%.
                </p>
                {defaultsErrors.fee && (
                  <p id="fee-error" className="mt-1 text-xs text-destructive">
                    {defaultsErrors.fee}
                  </p>
                )}
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
                  inputMode="decimal"
                  step={0.01}
                  min={0}
                  max={5}
                  value={slippagePercent}
                  onChange={(e) => {
                    setSlippagePercent(e.target.value);
                    setDefaultsErrors((prev) => ({
                      ...prev,
                      slippage: undefined,
                    }));
                  }}
                  placeholder="e.g. 0.05"
                  aria-invalid={Boolean(defaultsErrors.slippage)}
                  aria-describedby={
                    defaultsErrors.slippage ? "slippage-error" : "slippage-help"
                  }
                />
                <p id="slippage-help" className="mt-1 text-xs text-muted-foreground">
                  Estimated gap between expected and actual fill price (e.g. 0.05 = 0.05%). Leave blank to omit.
                </p>
                {defaultsErrors.slippage && (
                  <p id="slippage-error" className="mt-1 text-xs text-destructive">
                    {defaultsErrors.slippage}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
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
                <Button
                  type="button"
                  variant="ghost"
                  disabled={
                    isSaving ||
                    (feePercent === initialFeePercent &&
                      slippagePercent === initialSlippagePercent)
                  }
                  onClick={() => {
                    setFeePercent(initialFeePercent);
                    setSlippagePercent(initialSlippagePercent);
                    setDefaultsErrors({});
                  }}
                >
                  Reset
                </Button>
              </div>
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
                helper="Compact: one-line block summary on the canvas. Expanded: full input and output fields visible at a glance."
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
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
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
                  <div
                    role="alert"
                    className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0 break-words">
                      Couldn&apos;t load strategies: {strategiesError}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchStrategies}
                      className="min-h-11 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 sm:min-h-0"
                    >
                      Retry
                    </Button>
                  </div>
                ) : strategies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No strategies yet. Create one to control per-strategy digest preferences.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {strategies.map((s) => {
                      const pending = pendingStrategyToggleIds.has(s.id);
                      const labelId = `digest-strategy-${s.id}`;
                      return (
                        <li
                          key={s.id}
                          className={cn(
                            "flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 py-2 transition-opacity",
                            pending && "opacity-60"
                          )}
                        >
                          <label
                            id={labelId}
                            htmlFor={`digest-strategy-switch-${s.id}`}
                            className="min-w-0 flex-1 cursor-pointer break-words text-sm"
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
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <div id="analytics-label" className="text-sm font-medium">
                  Usage analytics
                </div>
                <p id="analytics-desc" className="text-xs text-muted-foreground">
                  No personal data is shared with third parties.
                </p>
              </div>
              <Switch
                id="analytics-consent"
                checked={analyticsConsent === "accepted"}
                onCheckedChange={handleConsentChange}
                aria-labelledby="analytics-label"
                aria-describedby="analytics-desc"
              />
            </div>
          </CardContent>
        </Card>

        {/* Group separator */}
        <div className="flex items-center gap-3 py-2" aria-hidden="true">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">Plan & Billing</span>
          <div className="h-px flex-1 bg-border" />
        </div>

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
              <CardTitle className="text-base">Credits & Add-Ons</CardTitle>
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
                  disabled={Boolean(isPurchasingPack || isUpgrading)}
                  className="min-h-11 w-full sm:min-h-0"
                >
                  {isPurchasingPack === "backtest_credits"
                    ? "Loading..."
                    : "Buy 50 Credits, $15"}
                </Button>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
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
                  disabled={Boolean(isPurchasingPack || isUpgrading)}
                  className="min-h-11 w-full sm:min-h-0"
                >
                  {isPurchasingPack === "strategy_slots"
                    ? "Loading..."
                    : "Buy +5 Slots, $9"}
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
              <CardTitle className="text-base">Billing & Plans</CardTitle>
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
                      Billed {profile.plan.interval === "annual" ? "annually" : "monthly"}
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
                        <span className="text-2xl font-bold tabular-nums">$19</span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                    </div>
                    <div className="text-sm sm:text-right">
                      <p className="text-muted-foreground">Annual billing:</p>
                      <p className="font-medium tabular-nums">$190/year</p>
                      <p className="text-xs font-medium text-success">Save 2 months</p>
                    </div>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    50 strategies · 200 backtests/day · 3 years of historical data
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={() => handleUpgrade("pro", "monthly")}
                      disabled={Boolean(isPurchasingPack || isUpgrading?.startsWith("pro"))}
                      className="flex-1"
                    >
                      {isUpgrading?.startsWith("pro") ? "Loading..." : "Upgrade Monthly"}
                    </Button>
                    <Button
                      onClick={() => handleUpgrade("pro", "annual")}
                      disabled={Boolean(isPurchasingPack || isUpgrading?.startsWith("pro"))}
                      variant="outline"
                      className="flex-1 border-primary/30 hover:border-primary"
                    >
                      {isUpgrading?.startsWith("pro") ? "Loading..." : "Annual · Save 2 months"}
                    </Button>
                  </div>
                </div>

                {/* Premium — secondary */}
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Premium</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        200 strategies · 500 backtests/day · 10 years of historical data
                      </p>
                    </div>
                    <div className="shrink-0 text-sm sm:text-right">
                      <span className="font-semibold tabular-nums">$49</span>
                      <span className="text-xs text-muted-foreground">/month</span>
                      <p className="text-xs text-muted-foreground">or $490/year · save 2 months</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpgrade("premium", "monthly")}
                      disabled={Boolean(isPurchasingPack || isUpgrading?.startsWith("premium"))}
                      className="flex-1"
                    >
                      {isUpgrading?.startsWith("premium") ? "Loading..." : "Monthly"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpgrade("premium", "annual")}
                      disabled={Boolean(isPurchasingPack || isUpgrading?.startsWith("premium"))}
                      className="flex-1"
                    >
                      {isUpgrading?.startsWith("premium") ? "Loading..." : "Annual · $490/year"}
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
    if (
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowRight" &&
      e.key !== "Home" &&
      e.key !== "End"
    ) {
      return;
    }
    e.preventDefault();
    const idx = options.findIndex((o) => o.value === value);
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? options.length - 1
          : e.key === "ArrowRight"
            ? (idx + 1) % options.length
            : (idx - 1 + options.length) % options.length;
    onChange(options[next].value);
  }
  return (
    <div className="min-w-0">
      <div id={`${groupId}-label`} className="mb-2.5 block text-sm font-medium">
        {label}
      </div>
      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        onKeyDown={handleKey}
        className="inline-flex max-w-full flex-wrap rounded-lg border bg-muted/50 p-0.5"
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
                "min-h-11 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring sm:min-h-0",
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

function validatePercentInput(value: string, label: "fee" | "slippage") {
  const trimmed = value.trim();
  const fieldLabel = label === "fee" ? "Trading fee" : "Slippage";

  if (trimmed === "") {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return `${fieldLabel} must be a number.`;
  }

  if (parsed < 0 || parsed > 5) {
    return `${fieldLabel} must be between 0% and 5%.`;
  }

  return undefined;
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
  const safeUsed = Number.isFinite(used) ? Math.max(0, used) : 0;
  const safeLimit = Number.isFinite(limit) ? Math.max(0, limit) : 0;
  const percent = safeLimit > 0 ? (safeUsed / safeLimit) * 100 : 0;
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const state = percent >= 100 ? "reached" : percent >= 80 ? "near" : "normal";
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
    <div className={cn(
      "rounded-lg border bg-muted/20 p-4",
      state === "reached" && "border-destructive/30"
    )}>
        <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
          <h3 className="font-medium">{title}</h3>
          <Badge variant={badgeVariant} className="tabular-nums">
            {safeUsed} / {safeLimit || "No limit"}
          </Badge>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-2 rounded-full transition-all duration-normal", barColor)}
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

function formatResetDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
