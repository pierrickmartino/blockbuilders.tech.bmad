export interface AlertRule {
  id: string;
  user_id: string;
  strategy_id: string;
  metric: string;
  threshold_pct: number | null;
  alert_on_entry: boolean;
  alert_on_exit: boolean;
  notify_in_app: boolean;
  notify_email: boolean;
  is_active: boolean;
  last_triggered_run_id?: string;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAlertRequest {
  strategy_id: string;
  threshold_pct: number | null;
  alert_on_entry: boolean;
  alert_on_exit: boolean;
  notify_email: boolean;
  is_active: boolean;
}

export interface UpdateAlertRequest {
  threshold_pct?: number | null;
  alert_on_entry?: boolean;
  alert_on_exit?: boolean;
  notify_email?: boolean;
  is_active?: boolean;
}
