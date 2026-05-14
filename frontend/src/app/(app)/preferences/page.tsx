"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useDisplay } from "@/context/display";
import { getConsent, setConsent } from "@/lib/analytics";
import { apiFetch, ApiError } from "@/lib/api";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Settings, Palette, Mail, Shield } from "lucide-react";

export default function PreferencesPage() {
  const { timezone, setTimezone, theme, setTheme, nodeDisplayMode, setNodeDisplayMode } =
    useDisplay();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Backtest defaults
  const [feePercent, setFeePercent] = useState("");
  const [slippagePercent, setSlippagePercent] = useState("");
  const [initialFeePercent, setInitialFeePercent] = useState("");
  const [initialSlippagePercent, setInitialSlippagePercent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [defaultsErrors, setDefaultsErrors] = useState<{
    fee?: string;
    slippage?: string;
  }>({});

  // Analytics consent (localStorage only)
  const [analyticsConsent, setAnalyticsConsent] = useState<"accepted" | "declined" | null>(null);

  // Email digest
  const [digestEnabled, setDigestEnabled] = useState(true);

  const digestRequestSeqRef = useRef(0);
  const committedDigestEnabledRef = useRef(true);

  useEffect(() => {
    setAnalyticsConsent(getConsent());
  }, []);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ProfileResponse>("/users/me");
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
      setError("Couldn't load preferences. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [setTimezone, setTheme]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleConsentChange = useCallback((accepted: boolean) => {
    setConsent(accepted);
    setAnalyticsConsent(accepted ? "accepted" : "declined");
  }, []);

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

    const data: UserUpdateRequest = {
      default_fee_percent: feePercent.trim() === "" ? null : Number(feePercent),
      default_slippage_percent:
        slippagePercent.trim() === "" ? null : Number(slippagePercent),
    };

    setIsSaving(true);
    try {
      const updated = await apiFetch<ProfileResponse>("/users/me", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      const savedFee = updated.settings.default_fee_percent?.toString() ?? "";
      const savedSlippage = updated.settings.default_slippage_percent?.toString() ?? "";
      setFeePercent(savedFee);
      setSlippagePercent(savedSlippage);
      setInitialFeePercent(savedFee);
      setInitialSlippagePercent(savedSlippage);
      toast.success("Defaults saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save defaults");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTimezoneChange(tz: "local" | "utc") {
    const previousTz = timezone;
    setTimezone(tz);
    try {
      await apiFetch<ProfileResponse>("/users/me", {
        method: "PUT",
        body: JSON.stringify({ timezone_preference: tz }),
      });
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
      await apiFetch<ProfileResponse>("/users/me", {
        method: "PUT",
        body: JSON.stringify({ theme_preference: newTheme }),
      });
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
      if (requestSeq !== digestRequestSeqRef.current) return;
      const persisted = updated.settings.digest_email_enabled;
      committedDigestEnabledRef.current = persisted;
      setDigestEnabled(persisted);
      toast.success(persisted ? "Digest emails enabled" : "Digest emails paused");
    } catch (err) {
      if (requestSeq !== digestRequestSeqRef.current) return;
      setDigestEnabled(committedDigestEnabledRef.current);
      toast.error(
        err instanceof ApiError ? err.message : "Failed to update digest preference"
      );
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-4 md:p-6">
        <div className="mb-6">
          <Skeleton className="mb-2 h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="mb-4">
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

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Preferences</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your backtest defaults and display settings.
        </p>
      </div>

      <div className="space-y-6">
        {/* Backtest Defaults */}
        <Card>
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
                <label htmlFor="fee" className="mb-2 block text-sm font-medium">
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
                  className="font-mono"
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
                <label htmlFor="slippage" className="mb-2 block text-sm font-medium">
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
                    setDefaultsErrors((prev) => ({ ...prev, slippage: undefined }));
                  }}
                  placeholder="e.g. 0.05"
                  aria-invalid={Boolean(defaultsErrors.slippage)}
                  aria-describedby={
                    defaultsErrors.slippage ? "slippage-error" : "slippage-help"
                  }
                  className="font-mono"
                />
                <p id="slippage-help" className="mt-1 text-xs text-muted-foreground">
                  Estimated gap between expected and actual fill price (e.g. 0.05 = 0.05%).
                  Slippage is the difference between the price you expect and the price you
                  actually get when an order fills. Leave blank to omit.
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
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Display Preferences</CardTitle>
            </div>
            <CardDescription>Customize how the app looks and feels.</CardDescription>
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

        {/* Email Digest */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Email Digest</CardTitle>
            </div>
            <CardDescription>
              Control weekly strategy performance digest emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <div id="digest-global-label" className="text-sm font-medium">
                  Weekly Strategy Digest
                </div>
                <p id="digest-global-desc" className="mt-1 text-xs text-muted-foreground">
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
            <p className="text-xs text-muted-foreground">
              To include or exclude individual strategies from the digest, open
              the strategy and adjust its settings on the{" "}
              <Link
                href="/strategies"
                className="font-medium text-primary underline"
              >
                Strategies
              </Link>{" "}
              page.
            </p>
          </CardContent>
        </Card>

        {/* Analytics Privacy */}
        <Card>
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
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SegmentedGroupProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  helper?: string;
}

function SegmentedGroup({ label, value, onChange, options, helper }: SegmentedGroupProps) {
  const groupId = `seg-${label.replace(/\s+/g, "-").toLowerCase()}`;

  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
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

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function validatePercentInput(value: string, label: "fee" | "slippage") {
  const trimmed = value.trim();
  const fieldLabel = label === "fee" ? "Trading fee" : "Slippage";
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return `${fieldLabel} must be a number.`;
  if (parsed < 0 || parsed > 5) return `${fieldLabel} must be between 0% and 5%.`;
  return undefined;
}
