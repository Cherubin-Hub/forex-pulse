"use client";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { PublicIdentity } from "@/types/auth";
import type { UserSettings } from "@/lib/schemas/settings";
import { DEFAULT_SETTINGS } from "@/lib/constants/settings";
import { loadSettings, saveSettings } from "@/lib/storage/settingsStorage";
import {
  fetchCloudSettings,
  saveCloudSettings,
} from "@/app/actions/settingsActions";

export type SettingsContextValue = {
  settings: UserSettings;
  identity: PublicIdentity | null;
  isLoaded: boolean;
  updateSettings: (next: UserSettings) => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
};
export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
  children,
  identity,
}: {
  children: ReactNode;
  identity: PublicIdentity | null;
}) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const userId = identity?.userId;
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
    setSettings(userId ? loadSettings(userId) : DEFAULT_SETTINGS);
    setIsLoaded(false);
    if (!userId) {
      setIsLoaded(true);
      return;
    }
    fetchCloudSettings()
      .then((result) => {
        if (cancelled) return;
        if (result.success && result.data) {
          setSettings(result.data);
          saveSettings(result.data, userId);
        } else {
          toast.error(
            result.error ?? "Cloud settings unavailable. Automation is paused.",
          );
          setSettings((previous) => ({
            ...previous,
            automationEnabled: false,
          }));
        }
        setIsLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setSettings((previous) => ({ ...previous, automationEnabled: false }));
        setIsLoaded(true);
        toast.error(
          "Cloud settings could not be reached. Automation is paused.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  const updateSettings = useCallback(
    async (next: UserSettings): Promise<boolean> => {
      if (!userId) {
        toast.error("Please sign in to save settings.");
        return false;
      }
      let result;
      try {
        result = await saveCloudSettings(next);
      } catch {
        toast.error("Settings were not saved. Check your connection.");
        return false;
      }
      if (!result.success) {
        toast.error(result.error ?? "Settings were not saved.");
        return false;
      }
      setSettings(next);
      saveSettings(next, userId);
      return true;
    },
    [userId],
  );
  const resetSettings = useCallback(
    () => updateSettings(DEFAULT_SETTINGS),
    [updateSettings],
  );
  const value = useMemo(
    () => ({ settings, identity, isLoaded, updateSettings, resetSettings }),
    [settings, identity, isLoaded, updateSettings, resetSettings],
  );
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context)
    throw new Error("useSettings must be used within a SettingsProvider");
  return context;
}
