"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AlertsApiClient, alertsKeys } from "@/lib/api/alerts-client";
import type { AlertRule } from "@/types/alert";

interface Props {
  backtestRunId: string;
  strategyId: string;
  /**
   * Strategy version the viewed backtest result is pinned to. Used to bind the
   * panel to the alert pinned to *this* result, rather than any alert that
   * happens to share the strategy. Omitted only when the version is unknown.
   */
  backtestRunVersionId?: string;
}

interface FormState {
  alertOnEntry: boolean;
  alertOnExit: boolean;
  thresholdPct: number | null;
  notifyEmail: boolean;
  notifyWebhook: boolean;
  webhookUrl: string;
}

const DEFAULT_FORM: FormState = {
  alertOnEntry: false,
  alertOnExit: false,
  thresholdPct: null,
  notifyEmail: false,
  notifyWebhook: false,
  webhookUrl: "",
};

function ruleToForm(rule: AlertRule): FormState {
  return {
    alertOnEntry: rule.alert_on_entry,
    alertOnExit: rule.alert_on_exit,
    thresholdPct: rule.threshold_pct,
    notifyEmail: rule.notify_email,
    notifyWebhook: rule.notify_webhook,
    webhookUrl: rule.webhook_url ?? "",
  };
}

const EXAMPLE_PAYLOAD = JSON.stringify(
  {
    type: "performance_alert",
    event: "entry",
    strategy_name: "Your Strategy",
    strategy_version_id: "uuid",
    asset: "BTC",
    timeframe: "1h",
    candle_ts: "2025-03-10T12:00:00+00:00",
    result_url: "https://blockbuilders.tech/backtests/…",
    fired_at: "2025-03-10T12:05:00+00:00",
  },
  null,
  2
);

export function PerformanceAlertPanel({
  backtestRunId,
  strategyId,
  backtestRunVersionId,
}: Props) {
  const queryClient = useQueryClient();

  const { data: allAlerts } = useQuery({
    queryKey: alertsKeys.list(),
    queryFn: () => AlertsApiClient.list(),
  });

  // Bind only to the *active* alert pinned to the viewed run's version. This
  // ignores migrated/deactivated rows (so the user can recreate after a
  // migration) and alerts pinned to a different version (so saving from a newer
  // result re-pins via backtest_run_id instead of PATCHing the stale row).
  const existingRule =
    allAlerts?.find(
      (a) =>
        a.alert_type === "performance" &&
        a.strategy_id === strategyId &&
        a.is_active &&
        (backtestRunVersionId === undefined ||
          a.strategy_version_id === undefined ||
          a.strategy_version_id === backtestRunVersionId),
    ) ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  const showForm = isEditing || !existingRule;

  function startEditing() {
    setForm(existingRule ? ruleToForm(existingRule) : DEFAULT_FORM);
    setIsEditing(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!existingRule) {
        return AlertsApiClient.create({
          alert_type: "performance",
          backtest_run_id: backtestRunId,
          threshold_pct: form.thresholdPct,
          alert_on_entry: form.alertOnEntry,
          alert_on_exit: form.alertOnExit,
          notify_email: form.notifyEmail,
          notify_webhook: form.notifyWebhook,
          webhook_url: form.notifyWebhook ? form.webhookUrl : undefined,
          is_active: true,
        });
      }
      return AlertsApiClient.update(existingRule.id, {
        threshold_pct: form.thresholdPct,
        alert_on_entry: form.alertOnEntry,
        alert_on_exit: form.alertOnExit,
        notify_email: form.notifyEmail,
        notify_webhook: form.notifyWebhook,
        webhook_url: form.notifyWebhook ? form.webhookUrl : undefined,
        is_active: existingRule.is_active,
      });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<AlertRule[]>(alertsKeys.list(), (current) => {
        if (!current) return [saved];
        if (current.some((r) => r.id === saved.id)) {
          return current.map((r) => (r.id === saved.id ? saved : r));
        }
        return [...current, saved];
      });
      queryClient.invalidateQueries({ queryKey: alertsKeys.all() });
      setIsEditing(false);
      setError(null);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to save alert");
    },
  });

  function handleSave() {
    if (form.thresholdPct !== null) {
      if (form.thresholdPct < 0.1 || form.thresholdPct > 100) {
        setError("Threshold must be between 0.1 and 100");
        return;
      }
    }
    if (!form.alertOnEntry && !form.alertOnExit && form.thresholdPct === null) {
      setError("Enable at least one alert condition");
      return;
    }
    if (form.notifyWebhook && !form.webhookUrl) {
      setError("Webhook URL is required when webhook notifications are enabled");
      return;
    }
    setError(null);
    saveMutation.mutate();
  }

  if (!showForm && existingRule) {
    const triggers = [
      existingRule.alert_on_entry && "Entry",
      existingRule.alert_on_exit && "Exit",
      existingRule.threshold_pct !== null && `Drawdown ≥ ${existingRule.threshold_pct}%`,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <div className="space-y-2">
        <div className="text-sm">
          <strong>Status:</strong>{" "}
          {existingRule.is_active ? "Active" : "Paused"}
        </div>
        {existingRule.is_active && (
          <>
            <div className="text-sm">
              <strong>Triggers:</strong> {triggers || "—"}
            </div>
            <div className="text-sm">
              <strong>Email:</strong>{" "}
              {existingRule.notify_email ? "Yes" : "No"}
            </div>
            <div className="text-sm">
              <strong>Webhook:</strong>{" "}
              {existingRule.notify_webhook ? existingRule.webhook_url ?? "Yes" : "No"}
            </div>
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={startEditing}
        >
          Edit alert
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Alert when</legend>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="pa-entry"
              checked={form.alertOnEntry}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, alertOnEntry: v === true }))
              }
            />
            <label htmlFor="pa-entry" className="text-sm">
              Strategy enters a position
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="pa-exit"
              checked={form.alertOnExit}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, alertOnExit: v === true }))
              }
            />
            <label htmlFor="pa-exit" className="text-sm">
              Strategy exits a position
            </label>
          </div>
        </div>
      </fieldset>

      <div>
        <label htmlFor="pa-threshold" className="text-sm">
          Drawdown threshold (%)
        </label>
        <Input
          id="pa-threshold"
          type="number"
          value={form.thresholdPct ?? ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              thresholdPct: e.target.value ? parseFloat(e.target.value) : null,
            }))
          }
          placeholder="e.g. 15"
          min="0.1"
          max="100"
          step="0.1"
          className="mt-1 h-8"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Fires once when drawdown crosses this level; re-arms on recovery.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <label htmlFor="pa-email" className="text-sm">
          Also notify by email
        </label>
        <Checkbox
          id="pa-email"
          checked={form.notifyEmail}
          onCheckedChange={(v) =>
            setForm((f) => ({ ...f, notifyEmail: v === true }))
          }
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="pa-webhook" className="text-sm">
            Send to webhook
          </label>
          <Checkbox
            id="pa-webhook"
            checked={form.notifyWebhook}
            onCheckedChange={(v) =>
              setForm((f) => ({ ...f, notifyWebhook: v === true }))
            }
          />
        </div>

        {form.notifyWebhook && (
          <div className="space-y-2 rounded-md border p-3">
            <Input
              id="pa-webhook-url"
              type="url"
              value={form.webhookUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, webhookUrl: e.target.value }))
              }
              placeholder="https://…"
              className="h-8 font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              HTTPS only. Blockbuilders posts a <em>signal</em>; it never places
              a trade or moves funds — what your bot does with it is up to you.
            </p>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                What we send
              </summary>
              <pre className="mt-1 overflow-auto rounded bg-muted p-2 text-xs">
                {EXAMPLE_PAYLOAD}
              </pre>
            </details>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-8"
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Saving…" : "Save alert"}
        </Button>
        {existingRule && (
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
