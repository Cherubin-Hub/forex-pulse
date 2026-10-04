"use client";

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserSettings } from "@/lib/schemas/settings";
import { DEFAULT_SETTINGS } from "@/lib/constants/settings";
import { clearSettings, loadSettings, saveSettings } from "@/lib/storage/settingsStorage";

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern (syncing with localStorage)
    setSettings(loadSettings());
    setIsLoaded(true);
  }, []);

  const updateSettings = useCallback((next: UserSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const resetSettings = useCallback(() => {
    clearSettings();
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(
    () => ({ settings, isLoaded, updateSettings, resetSettings }),
    [settings, isLoaded, updateSettings, resetSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
