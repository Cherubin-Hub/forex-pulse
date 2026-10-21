import { settingsSchema, type UserSettings } from "@/lib/schemas/settings";
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
} from "@/lib/constants/settings";

function getStorageKey(userId?: string | null): string {
  return userId ? `${SETTINGS_STORAGE_KEY}_${userId}` : SETTINGS_STORAGE_KEY;
}

/**
 * Persistence for user settings, scoped by user ID to guarantee multi-user isolation.
 */
export function loadSettings(userId?: string | null): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return DEFAULT_SETTINGS;

    const result = settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      ...JSON.parse(raw),
    });
    return result.success ? result.data : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(
  settings: UserSettings,
  userId?: string | null,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify(settings),
    );
  } catch {
    /* Cloud persistence remains authoritative when browser storage is unavailable. */
  }
}

export function clearSettings(userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getStorageKey(userId));
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
}
