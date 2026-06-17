import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertsApiClient, alertsKeys } from "@/lib/api/alerts-client";
import type { AlertRule } from "@/types/alert";

interface UseStrategyAlertsOptions {
  strategyId: string;
  backtestRunId?: string;
}

interface AlertFormState {
  sourceKey: string;
  alertEnabled: boolean;
  alertThreshold: number | null;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  notifyEmail: boolean;
  notifyWebhook: boolean;
  webhookUrl: string;
}

const getAlertFormKey = (rule: AlertRule | null) =>
  rule
    ? [
        rule.id,
        rule.is_active,
        rule.threshold_pct ?? "null",
        rule.alert_on_entry,
        rule.alert_on_exit,
        rule.notify_email,
        rule.notify_webhook,
        rule.webhook_url ?? "",
      ].join(":")
    : "none";

const buildAlertFormState = (rule: AlertRule | null): AlertFormState => ({
  sourceKey: getAlertFormKey(rule),
  alertEnabled: rule?.is_active ?? false,
  alertThreshold: rule?.threshold_pct ?? null,
  alertOnEntry: rule?.alert_on_entry ?? false,
  alertOnExit: rule?.alert_on_exit ?? false,
  notifyEmail: rule?.notify_email ?? false,
  notifyWebhook: rule?.notify_webhook ?? false,
  webhookUrl: rule?.webhook_url ?? "",
});

export function useStrategyAlerts({ strategyId, backtestRunId }: UseStrategyAlertsOptions) {
  const queryClient = useQueryClient();

  const [alertForm, setAlertForm] = useState(() => buildAlertFormState(null));
  const [isEditingAlert, setIsEditingAlert] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  const resetForm = useCallback((rule: AlertRule | null) => {
    setAlertForm(buildAlertFormState(rule));
  }, []);

  const { data: allAlerts, refetch } = useQuery({
    queryKey: alertsKeys.list(),
    queryFn: () => AlertsApiClient.list(),
  });

  const alertRule = allAlerts?.find((a) => a.strategy_id === strategyId) ?? null;
  const alertRuleFormKey = getAlertFormKey(alertRule);

  if (!isEditingAlert && alertForm.sourceKey !== alertRuleFormKey) {
    setAlertForm(buildAlertFormState(alertRule));
  }

  const {
    alertEnabled,
    alertThreshold,
    alertOnEntry,
    alertOnExit,
    notifyEmail,
    notifyWebhook,
    webhookUrl,
  } = alertForm;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!alertRule) {
        if (!backtestRunId) {
          throw new Error("Open a completed backtest result to create an alert.");
        }
        return AlertsApiClient.create({
          alert_type: "performance",
          backtest_run_id: backtestRunId,
          threshold_pct: alertThreshold ?? null,
          alert_on_entry: alertOnEntry,
          alert_on_exit: alertOnExit,
          notify_email: notifyEmail,
          notify_webhook: notifyWebhook,
          webhook_url: notifyWebhook ? webhookUrl : undefined,
          is_active: alertEnabled,
        });
      }
      return AlertsApiClient.update(alertRule.id, {
        threshold_pct: alertThreshold ?? null,
        alert_on_entry: alertOnEntry,
        alert_on_exit: alertOnExit,
        notify_email: notifyEmail,
        notify_webhook: notifyWebhook,
        webhook_url: notifyWebhook ? webhookUrl : undefined,
        is_active: alertEnabled,
      });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<AlertRule[]>(alertsKeys.list(), (current) => {
        if (!current) {
          return [saved];
        }
        if (current.some((rule) => rule.id === saved.id)) {
          return current.map((rule) => (rule.id === saved.id ? saved : rule));
        }
        return [...current, saved];
      });
      queryClient.invalidateQueries({ queryKey: alertsKeys.all() });
      resetForm(saved);
      setIsEditingAlert(false);
      setAlertError(null);
    },
    onError: (err: unknown) => {
      setAlertError(err instanceof Error ? err.message : "Failed to save alert");
    },
  });

  const save = useCallback(() => {
    if (alertThreshold !== null && (alertThreshold < 0.1 || alertThreshold > 100)) {
      setAlertError("Threshold must be between 0.1 and 100");
      return;
    }
    if (alertEnabled && !alertOnEntry && !alertOnExit && alertThreshold === null) {
      setAlertError("Enable at least one alert condition");
      return;
    }
    setAlertError(null);
    saveMutation.mutate();
  }, [alertThreshold, alertEnabled, alertOnEntry, alertOnExit, saveMutation]);

  const setAlertEnabled = useCallback((next: boolean) => {
    setAlertForm((current) => ({ ...current, alertEnabled: next }));
  }, []);

  const setAlertThreshold = useCallback((next: number | null) => {
    setAlertForm((current) => ({ ...current, alertThreshold: next }));
  }, []);

  const setAlertOnEntry = useCallback((next: boolean) => {
    setAlertForm((current) => ({ ...current, alertOnEntry: next }));
  }, []);

  const setAlertOnExit = useCallback((next: boolean) => {
    setAlertForm((current) => ({ ...current, alertOnExit: next }));
  }, []);

  const setNotifyEmail = useCallback((next: boolean) => {
    setAlertForm((current) => ({ ...current, notifyEmail: next }));
  }, []);

  const setNotifyWebhook = useCallback((next: boolean) => {
    setAlertForm((current) => ({ ...current, notifyWebhook: next }));
  }, []);

  const setWebhookUrl = useCallback((next: string) => {
    setAlertForm((current) => ({ ...current, webhookUrl: next }));
  }, []);

  const startEditing = useCallback(() => {
    resetForm(alertRule);
    setIsEditingAlert(true);
  }, [alertRule, resetForm]);

  const cancelEditing = useCallback(() => {
    setIsEditingAlert(false);
    resetForm(alertRule);
  }, [alertRule, resetForm]);

  return {
    alertRule,
    alertEnabled,
    alertThreshold,
    alertOnEntry,
    alertOnExit,
    notifyEmail,
    notifyWebhook,
    webhookUrl,
    alertError,
    isSavingAlert: saveMutation.isPending,
    isEditingAlert,
    setAlertEnabled,
    setAlertThreshold,
    setAlertOnEntry,
    setAlertOnExit,
    setNotifyEmail,
    setNotifyWebhook,
    setWebhookUrl,
    save,
    startEditing,
    cancelEditing,
    refetch,
  };
}
