"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { SystemNotification } from "@/types/notification";
import type { EconomicEvent } from "@/types/calendar";
import type { TradingSetup } from "@/types/setup";
import type { Database } from "@/types/database";
import { useNow } from "@/hooks/useNow";
import { createClient } from "@/lib/supabase/client";
import { mapRowToNotification } from "@/lib/supabase/mappers";
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
  const [realtimeNotifications, setRealtimeNotifications] = useState<SystemNotification[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set<string>());
  const [readIds, setReadIds] = useState<Set<string>>(new Set<string>());
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [desktopPermission, setDesktopPermission] =
    useState<NotificationPermission>("default");

  // Hydration sync: safely read LocalStorage preferences on client mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
    setReadIds(getOfflineReadIds());

    const savedSound = localStorage.getItem(SOUND_PREF_KEY);
    if (savedSound !== null) {
      setIsSoundEnabled(savedSound === "true");
    }

    setDesktopPermission(getDesktopNotificationPermission());
  }, []);

  // Merge initial server-fetched notifications with realtime updates
  const persistedNotifications = useMemo(() => {
    const map = new Map<string, SystemNotification>();
    initialNotifications.forEach((n) => map.set(n.id, n));
    realtimeNotifications.forEach((n) => map.set(n.id, n));
    return Array.from(map.values()).filter((n) => !deletedIds.has(n.id));
  }, [initialNotifications, realtimeNotifications, deletedIds]);

  // Supabase Realtime Subscription Channel
  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch (err) {
      console.debug("[Realtime] Supabase client unavailable, skipping realtime push:", err);
      return;
    }

    const channel = supabase
      .channel("realtime:notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newRow = payload.new as Database["public"]["Tables"]["notifications"]["Row"];
            const newNotif = mapRowToNotification(newRow);
            setRealtimeNotifications((prev) => [
              newNotif,
              ...prev.filter((n) => n.id !== newNotif.id),
            ]);

            if (isSoundEnabled) {
              playNotificationSound(newNotif.priority);
            }

            if (desktopPermission === "granted") {
              sendDesktopNotification(newNotif.title, {
                body: newNotif.message,
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedRow = payload.new as Database["public"]["Tables"]["notifications"]["Row"];
            const updated = mapRowToNotification(updatedRow);
            setRealtimeNotifications((prev) => [
              updated,
              ...prev.filter((n) => n.id !== updated.id),
            ]);
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId) {
              setDeletedIds((prev) => new Set<string>(prev).add(deletedId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [isSoundEnabled, desktopPermission]);

  // Synthesize alerts dynamically (merges database persisted items with live countdowns)
  const rawNotifications = useMemo(() => {
    if (!now) return persistedNotifications;
    return generateSystemNotifications(persistedNotifications, events, setups, now);
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

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => new Set<string>(prev).add(id));
    saveOfflineReadId(id);
    void markNotificationReadAction(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setReadIds((prev) => {
      const next = new Set<string>(prev);
      allIds.forEach((id) => next.add(id));
      return next;
    });
    saveAllOfflineReadIds(allIds);
    void markAllNotificationsReadAction();
  }, [notifications]);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_PREF_KEY, String(next));
      if (next) playNotificationSound("INFO");
      return next;
    });
  }, []);

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
