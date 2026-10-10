export type NotificationType = "NEWS_RISK" | "SETUP_STATUS" | "SESSION_ALERT" | "RISK_WARNING";
export type NotificationPriority = "CRITICAL" | "HIGH" | "INFO";

export type SystemNotification = {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  linkHref?: string;
  symbol?: string;
};
