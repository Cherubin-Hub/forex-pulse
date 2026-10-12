/**
 * Helper utilities for native Web Desktop Notification API.
 */

export function isDesktopNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getDesktopNotificationPermission(): NotificationPermission {
  if (!isDesktopNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (!isDesktopNotificationSupported()) return "denied";
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.debug("[DesktopNotif] Permission request error:", err);
    return "denied";
  }
}

export function sendDesktopNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!isDesktopNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const notif = new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return notif;
  } catch (err) {
    console.debug("[DesktopNotif] Failed to display notification:", err);
    return null;
  }
}
