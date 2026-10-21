"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { SystemNotification } from "@/types/notification";
import type { EconomicEvent } from "@/types/calendar";
import type { TradingSetup } from "@/types/setup";
import { useNow } from "@/hooks/useNow";
import { useSettings } from "@/hooks/useSettings";
import {
  generateSystemNotifications,
  getOfflineReadIds,
  saveOfflineReadId,
  saveAllOfflineReadIds,
} from "@/lib/notificationUtils";
import { playNotificationSound } from "@/lib/soundEffects";
import {
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
  sendDesktopNotification,
} from "@/lib/browserNotifications";
import {
  fetchNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/actions/notificationActions";

const SOUND_PREF_KEY = "fp_notification_sound_enabled_v1";

interface UseNotificationsProps {
  initialNotifications?: SystemNotification[];
  events?: EconomicEvent[];
  setups?: TradingSetup[];
}

export function useNotifications({
  initialNotifications = [],
  events = [],
  setups = [],
}: UseNotificationsProps) {
  const now = useNow();
  const { identity } = useSettings();
  const userId = identity?.userId;
  const knownIds = useRef(
    new Set(initialNotifications.map((notification) => notification.id)),
  );
  const [realtimeNotifications, setRealtimeNotifications] = useState<
    SystemNotification[] | null
  >(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set<string>());
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [desktopPermission, setDesktopPermission] =
    useState<NotificationPermission>("default");

  // Hydration sync: safely read LocalStorage preferences on client mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
    setReadIds(getOfflineReadIds(userId));

    try {
      const savedSound = localStorage.getItem(`${SOUND_PREF_KEY}:${userId}`);
      if (savedSound !== null) setIsSoundEnabled(savedSound === "true");
    } catch {
      /* Browser storage is optional. */
    }

    setDesktopPermission(getDesktopNotificationPermission());
  }, [userId]);

  // Merge initial server-fetched notifications with realtime updates
  const persistedNotifications = realtimeNotifications ?? initialNotifications;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false,
      busy = false;
    const refresh = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const next = await fetchNotificationsAction();
        if (cancelled) return;
        for (const notification of next) {
          if (!knownIds.current.has(notification.id)) {
            if (isSoundEnabled) playNotificationSound(notification.priority);
            if (desktopPermission === "granted")
              sendDesktopNotification(notification.title, {
                body: notification.message,
              });
          }
        }
        knownIds.current = new Set(next.map((notification) => notification.id));
        setRealtimeNotifications(next);
      } finally {
        busy = false;
      }
    };
    const timer = setInterval(() => {
      void refresh().catch(() => {});
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [userId, isSoundEnabled, desktopPermission]);

  // Synthesize alerts dynamically (merges database persisted items with live countdowns)
  const rawNotifications = useMemo(() => {
    if (!now) return persistedNotifications;
    return generateSystemNotifications(
      persistedNotifications,
      events,
      setups,
      now,
    );
  }, [persistedNotifications, events, setups, now]);

  // Synchronize read states
  const notifications: SystemNotification[] = useMemo(() => {
    return rawNotifications.map((n) => ({
      ...n,
      read: n.read || readIds.has(n.id),
    }));
  }, [rawNotifications, readIds]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markAsRead = useCallback(
    (id: string) => {
      setReadIds((prev) => new Set<string>(prev).add(id));
      saveOfflineReadId(id, userId);
      void markNotificationReadAction(id);
    },
    [userId],
  );

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setReadIds((prev) => {
      const next = new Set<string>(prev);
      allIds.forEach((id) => next.add(id));
      return next;
    });
    saveAllOfflineReadIds(allIds, userId);
    void markAllNotificationsReadAction();
  }, [notifications, userId]);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`${SOUND_PREF_KEY}:${userId}`, String(next));
      } catch {
        /* Browser storage is optional. */
      }
      if (next) playNotificationSound("INFO");
      return next;
    });
  }, [userId]);

  const requestDesktopPermission = useCallback(async () => {
    const permission = await requestDesktopNotificationPermission();
    setDesktopPermission(permission);
    if (permission === "granted") {
      sendDesktopNotification("ForexPulse Alerts Enabled", {
        body: "Institutional alerts will now notify you directly on your desktop.",
      });
    }
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isSoundEnabled,
    toggleSound,
    desktopPermission,
    requestDesktopPermission,
  };
}
