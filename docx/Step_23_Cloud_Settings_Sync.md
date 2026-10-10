# Step 23: Cloud Settings Sync (Hybrid Storage Pattern)

## 🎯 Overview
In this step, we implement a hybrid storage architecture for user preferences and risk boundaries: instant local read from browser `localStorage` on page mount to prevent React hydration layout shift, paired with an asynchronous background sync to PostgreSQL via Supabase `user_settings`.

---

### 1. Local Storage Layer (`lib/storage/settingsStorage.ts`)

Encapsulates browser `localStorage` access with fallback defaults.

**File:** `lib/storage/settingsStorage.ts`
```typescript
import type { UserSettings } from "@/lib/schemas/settings";
import { DEFAULT_SETTINGS } from "@/lib/constants/settings";

const STORAGE_KEY = "forex_pulse_user_settings";

export function loadSettings(): UserSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return JSON.parse(raw) as UserSettings;
  } catch (error) {
    console.warn("Failed to load settings from localStorage:", error);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Failed to save settings to localStorage:", error);
  }
}

export function clearSettings(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
```

#### Why this was written this way:
- **SSR Guard:** `typeof window === "undefined"` checks ensure Node.js server rendering never throws `ReferenceError: window is not defined`.
- **Fault-Tolerant JSON Parsing:** Wraps `JSON.parse` in try-catch so corrupted browser storage safely defaults to `DEFAULT_SETTINGS`.

---

### 2. Cloud Settings Server Actions (`app/actions/settingsActions.ts`)

Executes cloud reads and writes with authenticated Supabase queries.

**File:** `app/actions/settingsActions.ts`
```typescript
"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserSettings } from "@/lib/schemas/settings";

export interface SettingsActionResult {
  success: boolean;
  data?: Partial<UserSettings>;
  error?: string;
}

/**
 * Server Action to fetch user settings from Supabase.
 */
export async function fetchCloudSettings(): Promise<SettingsActionResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: true, data: undefined };

    const cloudSettings: Partial<UserSettings> = {
      traderProfile: data.trader_profile as UserSettings["traderProfile"],
      riskPerTradePercent: Number(data.risk_per_trade_percent),
      minRiskReward: Number(data.min_risk_reward),
      maxOpenSetups: Number(data.max_open_setups),
      sessionFocus: data.session_focus as UserSettings["sessionFocus"],
      newsSensitivity: data.news_sensitivity as UserSettings["newsSensitivity"],
    };

    return { success: true, data: cloudSettings };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch cloud settings";
    return { success: false, error: message };
  }
}

/**
 * Server Action to save or update settings in Supabase.
 */
export async function saveCloudSettings(settings: UserSettings): Promise<SettingsActionResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const payload = {
      user_id: user.id,
      trader_profile: settings.traderProfile,
      risk_per_trade_percent: settings.riskPerTradePercent,
      min_risk_reward: settings.minRiskReward,
      max_open_setups: settings.maxOpenSetups,
      session_focus: settings.sessionFocus,
      news_sensitivity: settings.newsSensitivity,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (existing?.id) {
      const res = await supabase.from("user_settings").update(payload).eq("id", existing.id);
      error = res.error;
    } else {
      const res = await supabase.from("user_settings").insert(payload);
      error = res.error;
    }

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save cloud settings";
    return { success: false, error: message };
  }
}
```

#### Why this was written this way:
- **Column Mapping:** Bridges PostgreSQL `snake_case` column naming (`risk_per_trade_percent`) with frontend TypeScript `camelCase` naming (`riskPerTradePercent`).
- **Upsert Logic:** Queries for existing records first; performs an `update` if an ID exists, or an `insert` if it is a newly registered trader.

---

### 3. Context Provider (`components/providers/SettingsProvider.tsx`)

Coordinates both layers to present a single unified interface to the app.

**File:** `components/providers/SettingsProvider.tsx`
```tsx
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern (syncing with localStorage)
    const local = loadSettings();
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
```

#### Why this was written this way:
- **Instant First Contentful Paint:** By loading `localStorage` synchronously during mount, forms never flicker or show blank inputs.
- **Background Merge:** Background cloud updates gracefully merge settings across devices and update local cache automatically.
