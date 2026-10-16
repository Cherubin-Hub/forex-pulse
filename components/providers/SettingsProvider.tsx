"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserSettings } from "@/lib/schemas/settings";
import { DEFAULT_SETTINGS } from "@/lib/constants/settings";
import { clearSettings, loadSettings, saveSettings } from "@/lib/storage/settingsStorage";
import { fetchCloudSettings, saveCloudSettings } from "@/app/actions/settingsActions";

export type SettingsContextValue = {
  settings: UserSettings;
  isLoaded: boolean;
  updateSettings: (next: UserSettings) => void;
  resetSettings: () => void;
};

export const SettingsContext = createContext<SettingsContextValue | null>(null);

function parseUserIdFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const cookies = document.cookie.split("; ");
    const sessionCookie = cookies.find((c) => c.startsWith("fp_gateway_session="));
    if (!sessionCookie) return null;

    const rawValue = decodeURIComponent(sessionCookie.split("=")[1] || "");
    let jsonStr = "";
    if (rawValue.includes(".")) {
      const base64Url = rawValue.split(".")[0];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      jsonStr = atob(base64);
    } else {
      jsonStr = rawValue;
    }
    const data = JSON.parse(jsonStr) as { userId?: string };
    return data.userId ?? null;
  } catch {
    return null;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const currentUserId = parseUserIdFromCookie();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
    setUserId(currentUserId);

    // 1. Instant local load for hydration matching, scoped by user ID
    const local = loadSettings(currentUserId);
    setSettings(local);
    setIsLoaded(true);

    // 2. Background cloud pull to keep in sync with Supabase for this specific user
    fetchCloudSettings().then((result) => {
      if (result.success && result.data) {
        setSettings((prev) => {
          const merged = { ...prev, ...result.data };
          saveSettings(merged, currentUserId); // Cache merged cloud settings locally for this user
          return merged;
        });
      }
    });
  }, []);

  const updateSettings = useCallback((next: UserSettings) => {
    setSettings(next);
    saveSettings(next, userId); // Local write scoped to user
    saveCloudSettings(next); // Cloud write scoped to user
  }, [userId]);

  const resetSettings = useCallback(() => {
    clearSettings(userId);
    setSettings(DEFAULT_SETTINGS);
    saveCloudSettings(DEFAULT_SETTINGS);
  }, [userId]);

  const value = useMemo(
    () => ({ settings, isLoaded, updateSettings, resetSettings }),
    [settings, isLoaded, updateSettings, resetSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
