# Step 25: User Identity Linking & Modular PostgreSQL Schema

## 🎯 Overview
In this step, we bind authenticated user identities (`auth.uid()`) to all Server Actions, enforce strict data ownership via Supabase Row-Level Security (RLS), and segregate the entire database architecture into modular, idempotent SQL migration files categorized by object type (`00_` to `05_`).

---

### 1. Update `app/actions/settingsActions.ts` (User-Scoped Settings Sync)

Replaces hardcoded placeholder UUIDs with the authenticated user ID fetched directly from the session cookie via `supabase.auth.getUser()`.

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
    
    // 1. Enforce Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    // 2. Fetch specific to this user
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

    // 1. Enforce Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    // 2. Use the actual user's UUID
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
- **Session Decryption:** Server Actions verify the session cookie on every call via `getUser()`.
- **User Scoping:** Queries explicitly target `user_id = user.id`, ensuring each trader has isolated risk preferences.

---

### 2. Modular PostgreSQL Schema Scripts

To maintain institutional code quality and easy deployment, the database schema is divided into 6 distinct folders. Every script is wrapped in atomic transactions (`BEGIN; ... COMMIT;`).

#### A. Extensions (`supabase/schema/00_extensions/00_extensions.sql`)
```sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

COMMIT;
```
*Why this was written this way:* Enables `uuid_generate_v4()` for random unique IDs and cryptographic hashing functions.

---

#### B. Tables (`supabase/schema/01_tables/`)

**File: `02_tbl_session_reports.sql`**
```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.session_reports (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title              TEXT NOT NULL,
    session            TEXT NOT NULL CHECK (session IN ('LONDON_OPEN', 'NEW_YORK_OPEN', 'ASIAN_WRAP')),
    timestamp          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now()),
    bias               TEXT NOT NULL CHECK (bias IN ('BULLISH_USD', 'BEARISH_USD', 'NEUTRAL', 'RISK_OFF', 'RISK_ON')),
    volatility         TEXT NOT NULL CHECK (volatility IN ('LOW', 'NORMAL', 'HIGH', 'EXTREME')),
    executive_summary  TEXT NOT NULL,
    macro_catalysts    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    key_levels         JSONB NOT NULL DEFAULT '[]'::JSONB,
    playbook           JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

COMMIT;
```
*Why this was written this way:* Stores macro briefings. Uses `JSONB` for `key_levels` and `playbook` for schema flexibility without nested relational tables.

**File: `03_tbl_user_settings.sql`**
```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_settings (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trader_profile         TEXT NOT NULL DEFAULT 'DAY_TRADER' CHECK (trader_profile IN ('SCALPER', 'DAY_TRADER', 'SWING_TRADER')),
    risk_per_trade_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    min_risk_reward        NUMERIC(5, 2) NOT NULL DEFAULT 2.00,
    max_open_setups        INTEGER NOT NULL DEFAULT 3,
    session_focus          TEXT[] NOT NULL DEFAULT ARRAY['LONDON', 'NEW_YORK']::TEXT[],
    news_sensitivity       TEXT NOT NULL DEFAULT 'CONSERVATIVE' CHECK (news_sensitivity IN ('AGGRESSIVE', 'MODERATE', 'CONSERVATIVE')),
    updated_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

COMMIT;
```
*Why this was written this way:* Foreign key references `auth.users(id)` with `UNIQUE`, enforcing exactly one risk profile per trader.

---

#### C. Stored Procedures / Functions (`supabase/schema/02_stored_procedures/`)

**File: `01_fn_handle_updated_at.sql`**
```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::TEXT, now());
    RETURN NEW;
END;
$$;

COMMIT;
```
*Why this was written this way:* Server-side function updating the `updated_at` timestamp before any record update is committed.

**File: `02_fn_handle_new_user.sql`**
```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_settings (
        user_id,
        trader_profile,
        risk_per_trade_percent,
        min_risk_reward,
        max_open_setups,
        session_focus,
        news_sensitivity
    ) VALUES (
        NEW.id,
        'DAY_TRADER',
        1.0,
        2.0,
        3,
        ARRAY['LONDON', 'NEW_YORK']::TEXT[],
        'CONSERVATIVE'
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

COMMIT;
```
*Why this was written this way:* Automatically generates default risk settings whenever a new account registers in Supabase Auth.

---

#### D. Triggers (`supabase/schema/03_triggers/`)

**File: `01_trg_trading_setups_updated_at.sql`**
```sql
BEGIN;

DROP TRIGGER IF EXISTS trg_trading_setups_updated_at ON public.trading_setups;

CREATE TRIGGER trg_trading_setups_updated_at
    BEFORE UPDATE ON public.trading_setups
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

COMMIT;
```

**File: `02_trg_user_settings_updated_at.sql`**
```sql
BEGIN;

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;

CREATE TRIGGER trg_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

COMMIT;
```

**File: `03_trg_on_auth_user_created.sql`**
```sql
BEGIN;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

COMMIT;
```

---

#### E. Row-Level Security Policies (`supabase/schema/04_policies/`)

**File: `01_rls_trading_setups.sql`**
```sql
BEGIN;

ALTER TABLE public.trading_setups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on trading_setups" ON public.trading_setups;
DROP POLICY IF EXISTS "Allow insert on trading_setups" ON public.trading_setups;
DROP POLICY IF EXISTS "Allow update on trading_setups" ON public.trading_setups;
DROP POLICY IF EXISTS "Allow delete on trading_setups" ON public.trading_setups;

CREATE POLICY "Allow select on trading_setups" ON public.trading_setups
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow insert on trading_setups" ON public.trading_setups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update on trading_setups" ON public.trading_setups
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow delete on trading_setups" ON public.trading_setups
    FOR DELETE USING (auth.uid() = user_id);

COMMIT;
```

**File: `03_rls_user_settings.sql`**
```sql
BEGIN;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;

CREATE POLICY "Users can view their own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

COMMIT;
```

---

#### F. Performance Indexes (`supabase/schema/05_indexes/`)

**File: `01_idx_trading_setups.sql`**
```sql
BEGIN;

CREATE INDEX IF NOT EXISTS idx_trading_setups_user_id ON public.trading_setups(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_setups_status ON public.trading_setups(status);
CREATE INDEX IF NOT EXISTS idx_trading_setups_created_at ON public.trading_setups(created_at DESC);

COMMIT;
```

**File: `03_idx_user_settings.sql`**
```sql
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

COMMIT;
```
*Why this was written this way:* Eliminates full table scans by indexing foreign keys and primary lookup filters.
