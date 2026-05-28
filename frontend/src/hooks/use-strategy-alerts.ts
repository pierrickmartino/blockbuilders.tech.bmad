import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertsApiClient, alertsKeys } from "@/lib/api/alerts-client";
import type { AlertRule } from "@/types/alert";

interface UseStrategyAlertsOptions {
  strategyId: string;
}

export function useStrategyAlerts({ strategyId }: UseStrategyAlertsOptions) {
  const queryClient = useQueryClient();

  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState<number | null>(null);
  const [alertOnEntry, setAlertOnEntry] = useState(false);
  const [alertOnExit, setAlertOnExit] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [isEditingAlert, setIsEditingAlert] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  const resetForm = useCallback((rule: AlertRule | null) => {
    setAlertEnabled(rule?.is_active ?? false);
    setAlertThreshold(rule?.threshold_pct ?? null);
    setAlertOnEntry(rule?.alert_on_entry ?? false);
    setAlertOnExit(rule?.alert_on_exit ?? false);
    setNotifyEmail(rule?.notify_email ?? false);
  }, []);

  const { data: allAlerts, refetch } = useQuery({
    queryKey: alertsKeys.list(),
    queryFn: () => AlertsApiClient.list(),
  });

  const alertRule = allAlerts?.find((a) => a.strategy_id === strategyId) ?? null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!alertRule) {
        return AlertsApiClient.create({
          alert_type: "performance",
          strategy_id: strategyId,
          threshold_pct: alertThreshold ?? null,
          alert_on_entry: alertOnEntry,
          alert_on_exit: alertOnExit,
          notify_email: notifyEmail,
          is_active: alertEnabled,
        });
      }
      return AlertsApiClient.update(alertRule.id, {
        threshold_pct: alertThreshold ?? null,
        alert_on_entry: alertOnEntry,
        alert_on_exit: alertOnExit,
        notify_email: notifyEmail,
        is_active: alertEnabled,
      });
    },
    onSuccess: (saved) => {
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
    isSavingAlert: saveMutation.isPending,
    isEditingAlert,
    setAlertEnabled,
    setAlertThreshold,
    setAlertOnEntry,
    setAlertOnExit,
    setNotifyEmail,
    save,
    startEditing,
    cancelEditing,
    refetch,
  };
}
