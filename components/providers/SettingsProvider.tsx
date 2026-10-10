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

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 1. Instant local load for hydration matching
    const local = loadSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern (syncing with localStorage)
    setSettings(local);
    setIsLoaded(true);

    // 2. Background cloud pull to keep in sync with Supabase
    fetchCloudSettings().then((result) => {
      if (result.success && result.data) {
        setSettings((prev) => {
          const merged = { ...prev, ...result.data };
          saveSettings(merged); // Cache merged cloud settings locally
          return merged;
        });
      }
    });
  }, []);

  const updateSettings = useCallback((next: UserSettings) => {
    setSettings(next);
    saveSettings(next); // Local write
    saveCloudSettings(next); // Cloud write in background
  }, []);

  const resetSettings = useCallback(() => {
    clearSettings();
    setSettings(DEFAULT_SETTINGS);
    saveCloudSettings(DEFAULT_SETTINGS);
  }, []);

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
