export type NotificationType =
  | "NEWS_RISK"
  | "SETUP_STATUS"
  | "SESSION_ALERT"
  | "RISK_WARNING"
  | "PRICE_SIGNAL";

export type NotificationPriority = "CRITICAL" | "HIGH" | "INFO";

export interface SystemNotification {
  id: string;
  userId?: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  linkHref?: string;
  symbol?: string;
  actionLabel?: string;
}
