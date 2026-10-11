# Step 48: Technical Analysis & Gold Service Layer Supabase Controller Migration

## 🎯 Objective
Complete the final Phase 3 service layer migration required by the Forex Pulse rulebook ([`AGENTS.md`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/AGENTS.md)). Following the successful migration of setups ([`lib/services/setups.ts`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/lib/services/setups.ts)), reports ([`lib/services/reports.ts`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/lib/services/reports.ts)), and macro feeds ([`lib/services/calendar.ts`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/lib/services/calendar.ts), [`lib/services/news.ts`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/lib/services/news.ts)), this step migrates the remaining mock controllers:
1. **Gold Hub Controller ([`lib/services/gold.ts`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/lib/services/gold.ts)):** Migrated to query PostgreSQL tables `gold_drivers` and `gold_key_levels` via `createServerSupabaseClient()`, with instant fallback to deterministic mock data when offline.
2. **Technical Analysis Controller ([`lib/services/technical.ts`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/lib/services/technical.ts)):** Migrated to query `technical_analysis` from Supabase with resilient offline fallback.
3. **Database Schema & Mappers ([`types/database.ts`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/types/database.ts), [`lib/supabase/mappers.ts`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/lib/supabase/mappers.ts), [`supabase/schema/01_tables/06_tbl_gold_and_technicals.sql`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/supabase/schema/01_tables/06_tbl_gold_and_technicals.sql)):** Adds strict database type bindings and data transformation mappers to guarantee complete type-safety without `any`.

---

## 🛠 Step-by-Step Implementation

### 1. Create SQL Migration (`supabase/schema/01_tables/06_tbl_gold_and_technicals.sql`)
Define the PostgreSQL tables for Gold macro drivers, Gold key levels, and multi-timeframe technical indicator snapshots.

**File:** `supabase/schema/01_tables/06_tbl_gold_and_technicals.sql`
```sql
-- ============================================================================
-- SCRIPT: 06_tbl_gold_and_technicals.sql
-- TYPE:   Table Definition & Realtime Setup
-- TABLES: public.gold_drivers, public.gold_key_levels, public.technical_analysis
-- ============================================================================

BEGIN;

-- 1. Gold Macro Catalysts & Yield Drivers
CREATE TABLE IF NOT EXISTS public.gold_drivers (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name               TEXT NOT NULL,
    value              TEXT NOT NULL,
    change             NUMERIC(8, 3) NOT NULL DEFAULT 0,
    correlation        TEXT NOT NULL CHECK (correlation IN ('POSITIVE', 'NEGATIVE')),
    impact             TEXT NOT NULL CHECK (impact IN ('BULLISH', 'BEARISH', 'NEUTRAL')),
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

-- 2. Gold Key Structural Pivot Levels
CREATE TABLE IF NOT EXISTS public.gold_key_levels (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price              NUMERIC(15, 2) NOT NULL,
    type               TEXT NOT NULL CHECK (type IN ('SUPPORT', 'RESISTANCE', 'PIVOT')),
    strength           TEXT NOT NULL CHECK (strength IN ('STRONG', 'MODERATE', 'WEAK')),
    notes              TEXT DEFAULT NULL,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

-- 3. Multi-Timeframe Technical Indicators Snapshot
CREATE TABLE IF NOT EXISTS public.technical_analysis (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol             TEXT NOT NULL UNIQUE,
    timeframes         JSONB NOT NULL DEFAULT '{}'::JSONB,
    overall_bias       TEXT NOT NULL CHECK (overall_bias IN ('BULLISH', 'BEARISH', 'NEUTRAL')),
    updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

-- Enable RLS (Read-only for public, modifications for service/authenticated)
ALTER TABLE public.gold_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold_key_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only access to gold_drivers"
    ON public.gold_drivers FOR SELECT TO public USING (true);

CREATE POLICY "Allow public read-only access to gold_key_levels"
    ON public.gold_key_levels FOR SELECT TO public USING (true);

CREATE POLICY "Allow public read-only access to technical_analysis"
    ON public.technical_analysis FOR SELECT TO public USING (true);

COMMIT;
```

---

### 2. Update Database Types Contract (`types/database.ts`)
Add type bindings for `gold_drivers`, `gold_key_levels`, and `technical_analysis` into the master Supabase `Database` interface.

**File:** `types/database.ts`
```typescript
import type { TradeDirection, SetupStatus } from "./setup";
import type { SessionType, MarketBias, VolatilityExpectation } from "./report";
import type { EventImpact } from "./calendar";
import type { NewsImpact } from "./news";
import type { DataStatus } from "./market";
import type { TrendDirection } from "./technical";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      trading_setups: {
        Row: {
          id: string;
          user_id: string | null;
          symbol: string;
          direction: TradeDirection;
          entry_min: number;
          entry_max: number;
          stop_loss: number;
          take_profit_1: number;
          take_profit_2: number | null;
          risk_reward: number;
          status: SetupStatus;
          invalidation_rule: string;
          notes: string | null;
          confluence_tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          symbol: string;
          direction: TradeDirection;
          entry_min: number;
          entry_max: number;
          stop_loss: number;
          take_profit_1: number;
          take_profit_2?: number | null;
          risk_reward: number;
          status: SetupStatus;
          invalidation_rule: string;
          notes?: string | null;
          confluence_tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trading_setups"]["Insert"]>;
        Relationships: [];
      };
      session_reports: {
        Row: {
          id: string;
          title: string;
          session: SessionType;
          timestamp: string;
          bias: MarketBias;
          volatility: VolatilityExpectation;
          executive_summary: string;
          macro_catalysts: string[];
          key_levels: Json;
          playbook: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          session: SessionType;
          timestamp?: string;
          bias: MarketBias;
          volatility: VolatilityExpectation;
          executive_summary: string;
          macro_catalysts?: string[];
          key_levels?: Json;
          playbook?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["session_reports"]["Insert"]>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          trader_profile: string;
          risk_per_trade_percent: number;
          min_risk_reward: number;
          max_open_setups: number;
          session_focus: string[];
          news_sensitivity: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trader_profile?: string;
          risk_per_trade_percent?: number;
          min_risk_reward?: number;
          max_open_setups?: number;
          session_focus?: string[];
          news_sensitivity?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Insert"]>;
        Relationships: [];
      };
      economic_events: {
        Row: {
          id: string;
          title: string;
          currency: string;
          impact: EventImpact;
          scheduled_at: string;
          forecast: string | null;
          previous: string | null;
          actual: string | null;
          source: string;
          status: DataStatus;
          created_at: string;
        };
        Insert: {
          id: string;
          title: string;
          currency: string;
          impact: EventImpact;
          scheduled_at: string;
          forecast?: string | null;
          previous?: string | null;
          actual?: string | null;
          source?: string;
          status?: DataStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["economic_events"]["Insert"]>;
        Relationships: [];
      };
      market_news: {
        Row: {
          id: string;
          headline: string;
          summary: string;
          source: string;
          url: string | null;
          impact: NewsImpact;
          currencies: string[];
          published_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          headline: string;
          summary: string;
          source: string;
          url?: string | null;
          impact: NewsImpact;
          currencies?: string[];
          published_at: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["market_news"]["Insert"]>;
        Relationships: [];
      };
      gold_drivers: {
        Row: {
          id: string;
          name: string;
          value: string;
          change: number;
          correlation: "POSITIVE" | "NEGATIVE";
          impact: "BULLISH" | "BEARISH" | "NEUTRAL";
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          value: string;
          change?: number;
          correlation: "POSITIVE" | "NEGATIVE";
          impact: "BULLISH" | "BEARISH" | "NEUTRAL";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gold_drivers"]["Insert"]>;
        Relationships: [];
      };
      gold_key_levels: {
        Row: {
          id: string;
          price: number;
          type: "SUPPORT" | "RESISTANCE" | "PIVOT";
          strength: "STRONG" | "MODERATE" | "WEAK";
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          price: number;
          type: "SUPPORT" | "RESISTANCE" | "PIVOT";
          strength: "STRONG" | "MODERATE" | "WEAK";
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gold_key_levels"]["Insert"]>;
        Relationships: [];
      };
      technical_analysis: {
        Row: {
          id: string;
          symbol: string;
          timeframes: Json;
          overall_bias: TrendDirection;
          updated_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          timeframes: Json;
          overall_bias: TrendDirection;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["technical_analysis"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
```

---

### 3. Add Transformation Mappers (`lib/supabase/mappers.ts`)
Add data mappers to convert Supabase snake_case rows into application models.

**File:** `lib/supabase/mappers.ts`
```typescript
import type { Database } from "@/types/database";
import type { TradingSetup } from "@/types/setup";
import type { SessionReport, KeyLevelBrief } from "@/types/report";
import type { EconomicEvent } from "@/types/calendar";
import type { NewsArticle } from "@/types/news";
import type { GoldDriver, KeyLevel } from "@/types/gold";
import type { TechnicalAnalysis, Timeframe, IndicatorData } from "@/types/technical";

type SetupRow = Database["public"]["Tables"]["trading_setups"]["Row"];
type ReportRow = Database["public"]["Tables"]["session_reports"]["Row"];
type EventRow = Database["public"]["Tables"]["economic_events"]["Row"];
type NewsRow = Database["public"]["Tables"]["market_news"]["Row"];
type GoldDriverRow = Database["public"]["Tables"]["gold_drivers"]["Row"];
type GoldKeyLevelRow = Database["public"]["Tables"]["gold_key_levels"]["Row"];
type TechnicalAnalysisRow = Database["public"]["Tables"]["technical_analysis"]["Row"];

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

/**
 * Maps a Supabase snake_case event row to our application's EconomicEvent model.
 */
export function mapRowToEvent(row: EventRow): EconomicEvent {
  return {
    id: row.id,
    title: row.title,
    currency: row.currency,
    impact: row.impact,
    scheduledAt: row.scheduled_at,
    forecast: row.forecast,
    previous: row.previous,
    actual: row.actual,
    source: row.source,
    status: row.status,
  };
}

/**
 * Maps a Supabase snake_case news row to our application's NewsArticle model.
 */
export function mapRowToNews(row: NewsRow): NewsArticle {
  return {
    id: row.id,
    headline: row.headline,
    summary: row.summary,
    source: row.source,
    url: row.url ?? undefined,
    impact: row.impact,
    currencies: row.currencies ?? [],
    publishedAt: row.published_at,
  };
}

/**
 * Maps a Supabase snake_case gold driver row to our application's GoldDriver model.
 */
export function mapRowToGoldDriver(row: GoldDriverRow): GoldDriver {
  return {
    id: row.id,
    name: row.name,
    value: row.value,
    change: Number(row.change),
    correlation: row.correlation,
    impact: row.impact,
  };
}

/**
 * Maps a Supabase snake_case gold key level row to our application's KeyLevel model.
 */
export function mapRowToKeyLevel(row: GoldKeyLevelRow): KeyLevel {
  return {
    id: row.id,
    price: Number(row.price),
    type: row.type,
    strength: row.strength,
    notes: row.notes ?? undefined,
  };
}

/**
 * Maps a Supabase snake_case technical analysis row to our application's TechnicalAnalysis model.
 */
export function mapRowToTechnicalAnalysis(row: TechnicalAnalysisRow): TechnicalAnalysis {
  return {
    symbol: row.symbol,
    timeframes: (row.timeframes as unknown as Record<Timeframe, IndicatorData>) ?? {},
    overallBias: row.overall_bias,
  };
}
```

---

### 4. Upgrade Gold Controller (`lib/services/gold.ts`)
Connect Gold drivers and key levels to Supabase with automatic mock fallback.

**File:** `lib/services/gold.ts`
```typescript
import type { GoldDriver, KeyLevel } from "@/types/gold";
import { MOCK_GOLD_DRIVERS, MOCK_KEY_LEVELS } from "@/lib/mock/gold";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToGoldDriver, mapRowToKeyLevel } from "@/lib/supabase/mappers";

/**
 * Controller service to retrieve Gold macro driver assets.
 * Queries Supabase first; falls back to deterministic mock data if empty or offline.
 */
export async function getGoldDrivers(): Promise<GoldDriver[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("gold_drivers")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase gold drivers query error, using mock fallback:", error.message);
      return MOCK_GOLD_DRIVERS;
    }

    return data.map(mapRowToGoldDriver);
  } catch (err) {
    console.warn("Supabase client unavailable, using mock gold drivers fallback:", err instanceof Error ? err.message : err);
    return MOCK_GOLD_DRIVERS;
  }
}

/**
 * Controller service to retrieve Gold institutional key price levels.
 * Queries Supabase first; falls back to deterministic mock data if empty or offline.
 */
export async function getGoldKeyLevels(): Promise<KeyLevel[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("gold_key_levels")
      .select("*")
      .order("price", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase gold key levels query error, using mock fallback:", error.message);
      return MOCK_KEY_LEVELS;
    }

    return data.map(mapRowToKeyLevel);
  } catch (err) {
    console.warn("Supabase client unavailable, using mock key levels fallback:", err instanceof Error ? err.message : err);
    return MOCK_KEY_LEVELS;
  }
}
```

---

### 5. Upgrade Technical Analysis Controller (`lib/services/technical.ts`)
Connect multi-timeframe technical snapshots to Supabase with automatic mock fallback.

**File:** `lib/services/technical.ts`
```typescript
import type { TechnicalAnalysis } from "@/types/technical";
import { MOCK_TECHNICALS } from "@/lib/mock/technical";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToTechnicalAnalysis } from "@/lib/supabase/mappers";

/**
 * Controller service to retrieve multi-timeframe technical indicator analysis.
 * Queries Supabase first; falls back to deterministic mock data if empty or offline.
 */
export async function getTechnicalAnalysis(): Promise<TechnicalAnalysis[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("technical_analysis")
      .select("*");

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase technical query error, using mock fallback:", error.message);
      return MOCK_TECHNICALS;
    }

    return data.map(mapRowToTechnicalAnalysis);
  } catch (err) {
    console.warn("Supabase client unavailable, using mock technicals fallback:", err instanceof Error ? err.message : err);
    return MOCK_TECHNICALS;
  }
}
```

---

## 🧪 Verification & Testing
1. Navigate to [`/gold`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/app/(dashboard)/gold/page.tsx) and verify Gold Drivers and Key Levels load with zero latency and fallback resilience.
2. Navigate to [`/technical`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/app/(dashboard)/technical/page.tsx) and verify Multi-Timeframe trend and indicator matrices render cleanly.
3. Run `npx tsc --noEmit` in your terminal to ensure 0 TypeScript compilation errors.

