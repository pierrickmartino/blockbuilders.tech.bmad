export type AlertType = "performance" | "price";
export type Direction = "above" | "below";

export interface AlertRule {
  id: string;
  user_id: string;
  alert_type: AlertType;

  // Performance alert fields
  strategy_id?: string;
  metric?: string;
  threshold_pct: number | null;
  alert_on_entry: boolean;
  alert_on_exit: boolean;
  last_triggered_run_id?: string;

  // Price alert fields
  asset?: string;
  direction?: Direction;
  threshold_price?: number;
  notify_webhook: boolean;
  webhook_url?: string;
  expires_at?: string;
  last_checked_price?: number;

  // Common fields
  notify_in_app: boolean;
  notify_email: boolean;
  is_active: boolean;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePerformanceAlertRequest {
  alert_type: "performance";
  strategy_id: string;
  threshold_pct: number | null;
  alert_on_entry: boolean;
  alert_on_exit: boolean;
  notify_email: boolean;
  is_active: boolean;
}

export interface CreatePriceAlertRequest {
  alert_type: "price";
  asset: string;
  direction: Direction;
  threshold_price: number;
  notify_email: boolean;
  notify_webhook: boolean;
  webhook_url?: string;
  expires_at?: string;
  is_active: boolean;
}

export type CreateAlertRequest = CreatePerformanceAlertRequest | CreatePriceAlertRequest;

export interface UpdateAlertRequest {
  // Performance alert fields
  threshold_pct?: number | null;
  alert_on_entry?: boolean;
  alert_on_exit?: boolean;

  // Price alert fields
  threshold_price?: number;
  notify_webhook?: boolean;
  webhook_url?: string;
  expires_at?: string;

  // Common fields
  notify_email?: boolean;
  is_active?: boolean;
}
