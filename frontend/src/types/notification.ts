export type NotificationType =
  | "backtest_completed"
  | "usage_limit_reached"
  | "performance_alert"
  | "new_follower"
  | "strategy_commented"
  | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  unread_count: number;
}
