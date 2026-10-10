# Step 20: Service Layer Controller Migration with Offline Fallback

## 🎯 Overview
In this step, we migrate the application controllers (`lib/services/setups.ts` and `lib/services/reports.ts`) to query PostgreSQL through Supabase. We implement a database-to-domain mapper layer (`lib/supabase/mappers.ts`) and ensure that if the database is unreachable or offline, the controllers automatically fall back to local mock data without breaking the UI.

---

### 1. Database-to-Domain Mappers (`lib/supabase/mappers.ts`)

Converts database `snake_case` records into strict TypeScript domain models.

**File:** `lib/supabase/mappers.ts`
```typescript
import type { Database } from "@/types/database";
import type { TradingSetup } from "@/types/setup";
import type { SessionReport, KeyLevelBrief } from "@/types/report";

type SetupRow = Database["public"]["Tables"]["trading_setups"]["Row"];
type ReportRow = Database["public"]["Tables"]["session_reports"]["Row"];

/**
 * Maps a Supabase snake_case setup row to our application's TradingSetup model.
 */
export function mapRowToSetup(row: SetupRow): TradingSetup {
  return {
    id: row.id,
    symbol: row.symbol,
    direction: row.direction,
    entryMin: Number(row.entry_min),
    entryMax: Number(row.entry_max),
    stopLoss: Number(row.stop_loss),
    takeProfit1: Number(row.take_profit_1),
    takeProfit2: row.take_profit_2 !== null ? Number(row.take_profit_2) : null,
    riskReward: Number(row.risk_reward),
    status: row.status,
    invalidationRule: row.invalidation_rule,
    notes: row.notes ?? "",
    confluenceTags: row.confluence_tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a Supabase snake_case report row to our application's SessionReport model.
 */
export function mapRowToReport(row: ReportRow): SessionReport {
  return {
    id: row.id,
    title: row.title,
    session: row.session,
    timestamp: row.timestamp,
    bias: row.bias,
    volatility: row.volatility,
    executiveSummary: row.executive_summary,
    macroCatalysts: row.macro_catalysts ?? [],
    keyLevels: (row.key_levels as unknown as KeyLevelBrief[]) ?? [],
    playbook: (row.playbook as unknown as SessionReport["playbook"]) ?? {
      focusPairs: [],
      riskRule: "",
      tradeOpportunities: [],
    },
  };
}
```

#### Why this was written this way:
- **Type Separation:** Keeps PostgreSQL storage representations independent of frontend domain types. If a database column name changes, only the mapper function needs updating, leaving UI components untouched.

---

### 2. Setups Service Controller (`lib/services/setups.ts`)

**File:** `lib/services/setups.ts`
```typescript
import type { TradingSetup } from "@/types/setup";
import { MOCK_ACTIVE_SETUPS, MOCK_HISTORY_SETUPS } from "@/lib/mock/setups";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToSetup } from "@/lib/supabase/mappers";

/**
 * Retrieves currently active trading setups (WAITING_FOR_CONFIRMATION or ENTRY_TRIGGERED).
 * Queries Supabase first; falls back to mock data if empty or connection fails.
 */
export async function getActiveSetups(): Promise<TradingSetup[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("trading_setups")
      .select("*")
      .in("status", ["WAITING_FOR_CONFIRMATION", "ENTRY_TRIGGERED"])
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase active setups query error, using mock fallback:", error.message);
      return MOCK_ACTIVE_SETUPS;
    }

    return data.map(mapRowToSetup);
  } catch (err) {
    console.warn("Supabase client unavailable, using mock setups fallback:", err instanceof Error ? err.message : err);
    return MOCK_ACTIVE_SETUPS;
  }
}

/**
 * Retrieves closed / historical setups (TP_REACHED, SL_HIT, INVALIDATED, EXPIRED).
 */
export async function getHistorySetups(): Promise<TradingSetup[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("trading_setups")
      .select("*")
      .in("status", ["TP_REACHED", "SL_HIT", "INVALIDATED", "EXPIRED"])
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase history setups query error, using mock fallback:", error.message);
      return MOCK_HISTORY_SETUPS;
    }

    return data.map(mapRowToSetup);
  } catch (err) {
    console.warn("Supabase client unavailable, using mock history fallback:", err instanceof Error ? err.message : err);
    return MOCK_HISTORY_SETUPS;
  }
}
```

---

### 3. Session Reports Service Controller (`lib/services/reports.ts`)

**File:** `lib/services/reports.ts`
```typescript
import type { SessionReport } from "@/types/report";
import { MOCK_REPORTS } from "@/lib/mock/reports";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToReport } from "@/lib/supabase/mappers";

/**
 * Controller service to retrieve all session reports.
 * Queries Supabase first; falls back to mock data if empty or offline.
 */
export async function getSessionReports(): Promise<SessionReport[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("session_reports")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase reports query error, using mock fallback:", error.message);
      return MOCK_REPORTS;
    }

    return data.map(mapRowToReport);
  } catch (err) {
    console.warn("Supabase client unavailable, using mock reports fallback:", err instanceof Error ? err.message : err);
    return MOCK_REPORTS;
  }
}

export async function getLatestReport(): Promise<SessionReport | null> {
  const reports = await getSessionReports();
  return reports[0] ?? null;
}
```

#### Why this was written this way:
- **Resilient Fallback Design:** In Next.js, network dropouts or paused Supabase free-tier instances would normally trigger an unhandled error boundary. Falling back to structured mock data ensures uninterrupted dashboard operation during development.
