import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AlertRule } from "@/types/alert";

interface UseStrategyAlertsOptions {
  strategyId: string;
}

export function useStrategyAlerts({ strategyId }: UseStrategyAlertsOptions) {
  const [alertRule, setAlertRule] = useState<AlertRule | null>(null);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState<number | null>(null);
  const [alertOnEntry, setAlertOnEntry] = useState(false);
  const [alertOnExit, setAlertOnExit] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [isSavingAlert, setIsSavingAlert] = useState(false);
  const [isEditingAlert, setIsEditingAlert] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  const resetForm = useCallback((rule: AlertRule | null) => {
    setAlertEnabled(rule?.is_active ?? false);
    setAlertThreshold(rule?.threshold_pct ?? null);
    setAlertOnEntry(rule?.alert_on_entry ?? false);
    setAlertOnExit(rule?.alert_on_exit ?? false);
    setNotifyEmail(rule?.notify_email ?? false);
  }, []);

  useEffect(() => {
    const fetchAlert = async () => {
      try {
        const alerts = await apiFetch<AlertRule[]>("/alerts/");
        const rule = alerts.find((a) => a.strategy_id === strategyId);
        if (rule) {
          setAlertRule(rule);
          resetForm(rule);
        }
        setIsEditingAlert(!rule);
      } catch (err) {
        console.error("Failed to load alert", err);
      }
    };
    fetchAlert();
  }, [strategyId, resetForm]);

  const save = useCallback(async () => {
    if (alertThreshold !== null && (alertThreshold < 0.1 || alertThreshold > 100)) {
      setAlertError("Threshold must be between 0.1 and 100");
      return;
    }
    if (alertEnabled && !alertOnEntry && !alertOnExit && alertThreshold === null) {
      setAlertError("Enable at least one alert condition");
      return;
    }

    setIsSavingAlert(true);
    setAlertError(null);
    try {
      if (!alertRule) {
        const created = await apiFetch<AlertRule>("/alerts/", {
          method: "POST",
          body: JSON.stringify({
            alert_type: "performance",
            strategy_id: strategyId,
            threshold_pct: alertThreshold ?? null,
            alert_on_entry: alertOnEntry,
            alert_on_exit: alertOnExit,
            notify_email: notifyEmail,
            is_active: alertEnabled,
          }),
        });
        setAlertRule(created);
        resetForm(created);
      } else {
        const updated = await apiFetch<AlertRule>(`/alerts/${alertRule.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            threshold_pct: alertThreshold ?? null,
            alert_on_entry: alertOnEntry,
            alert_on_exit: alertOnExit,
            notify_email: notifyEmail,
            is_active: alertEnabled,
          }),
        });
        setAlertRule(updated);
        resetForm(updated);
      }
      setIsEditingAlert(false);
    } catch (err) {
      setAlertError(err instanceof Error ? err.message : "Failed to save alert");
    } finally {
      setIsSavingAlert(false);
    }
  }, [alertThreshold, alertEnabled, alertOnEntry, alertOnExit, notifyEmail, alertRule, strategyId, resetForm]);

  const startEditing = useCallback(() => setIsEditingAlert(true), []);

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
    alertError,
    isSavingAlert,
    isEditingAlert,
    setAlertEnabled,
    setAlertThreshold,
    setAlertOnEntry,
    setAlertOnExit,
    setNotifyEmail,
    save,
    startEditing,
    cancelEditing,
  };
}
