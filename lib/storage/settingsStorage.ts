import { settingsSchema, type UserSettings } from "@/lib/schemas/settings";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from "@/lib/constants/settings";

/**
 * Persistence for user settings.
 * Today: browser localStorage. Later: Supabase — only this file changes.
 */
export function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const result = settingsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function clearSettings(): void {
  window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
}
