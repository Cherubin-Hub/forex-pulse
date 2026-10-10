# Step 38: Macro Intelligence Supabase Schema & Realtime Controller Migration

## 🎯 Objective
Complete the Phase 3 backend migration by transitioning the application's macro intelligence layers—the **Economic Calendar** (`/calendar`) and **Market News Feed** (`/news`)—to PostgreSQL via Supabase with resilient offline fallbacks. This step delivers:
1. **Modular PostgreSQL Schemas:** Adds `04_tbl_economic_events.sql` and `05_tbl_market_news.sql` with public read Row Level Security (RLS) policies.
2. **Supabase Database Types Synchronization (`types/database.ts`):** Extends the TypeScript `Database` interface to include strong schemas for `economic_events` and `market_news`.
3. **Database-to-Domain Mappers (`lib/supabase/mappers.ts`):** Introduces bidirectional mappers `mapRowToEvent` and `mapRowToNews` converting snake_case SQL records to strict camelCase TypeScript domain entities.
4. **Resilient Service Controllers (`lib/services/calendar.ts` & `lib/services/news.ts`):** Migrates controllers to query Supabase first with automatic offline fallback to local mock data.

---

## 🛠 Step-by-Step Implementation

### 1. Create Economic Events SQL Table (`supabase/schema/01_tables/04_tbl_economic_events.sql`)
Define the relational schema for tracking macroeconomic releases.

**File:** `supabase/schema/01_tables/04_tbl_economic_events.sql`
```sql
-- ============================================================================
-- Table: economic_events
-- Purpose: Global economic calendar releases with forecasts, actuals, and impact
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.economic_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  currency TEXT NOT NULL,
  impact TEXT NOT NULL CHECK (impact IN ('HIGH', 'MEDIUM', 'LOW')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  forecast TEXT,
  previous TEXT,
  actual TEXT,
  source TEXT NOT NULL DEFAULT 'Supabase Cloud',
  status TEXT NOT NULL DEFAULT 'LIVE' CHECK (status IN ('LIVE', 'DELAYED', 'MOCK', 'UNAVAILABLE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indices for rapid session filtering and chronological querying
CREATE INDEX IF NOT EXISTS idx_economic_events_scheduled_at ON public.economic_events(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_economic_events_currency ON public.economic_events(currency);
CREATE INDEX IF NOT EXISTS idx_economic_events_impact ON public.economic_events(impact);
```

---

### 2. Create Market News SQL Table (`supabase/schema/01_tables/05_tbl_market_news.sql`)
Define the relational schema for global market news articles and sentiment tagging.

**File:** `supabase/schema/01_tables/05_tbl_market_news.sql`
```sql
-- ============================================================================
-- Table: market_news
-- Purpose: Market intelligence articles, impact ratings, and affected currencies
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.market_news (
  id TEXT PRIMARY KEY,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT,
  impact TEXT NOT NULL CHECK (impact IN ('HIGH', 'MEDIUM', 'LOW')),
  currencies TEXT[] NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indices for reverse chronological timeline sorting and currency lookups
CREATE INDEX IF NOT EXISTS idx_market_news_published_at ON public.market_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_news_currencies ON public.market_news USING GIN (currencies);
```

---

### 3. Create Public Read RLS Policies (`supabase/schema/04_policies/02_macro_public_policies.sql`)
Enable Row Level Security (RLS) while allowing all authenticated and anonymous clients to read universal macroeconomic data.

**File:** `supabase/schema/04_policies/02_macro_public_policies.sql`
```sql
-- ============================================================================
-- Row Level Security (RLS) Policies for Public Macro Intelligence
-- ============================================================================

ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_news ENABLE ROW LEVEL SECURITY;

-- Allow read access to all clients for economic releases
DROP POLICY IF EXISTS "Public can view economic events" ON public.economic_events;
CREATE POLICY "Public can view economic events"
  ON public.economic_events
  FOR SELECT
  USING (true);

-- Allow read access to all clients for market news
DROP POLICY IF EXISTS "Public can view market news" ON public.market_news;
CREATE POLICY "Public can view market news"
  ON public.market_news
  FOR SELECT
  USING (true);
```

---

### 4. Expand Database Type Definitions (`types/database.ts`)
Extend the TypeScript database schema to include `economic_events` and `market_news`.

**File:** `types/database.ts`
```typescript
import type { TradeDirection, SetupStatus } from "./setup";
import type { SessionType, MarketBias, VolatilityExpectation } from "./report";
import type { EventImpact } from "./calendar";
import type { NewsImpact } from "./news";
import type { DataStatus } from "./market";

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
```

---

### 5. Expand Domain Mappers (`lib/supabase/mappers.ts`)
Add database row mappers for economic events and market news articles.

**File:** `lib/supabase/mappers.ts`
```typescript
import type { Database } from "@/types/database";
import type { TradingSetup } from "@/types/setup";
import type { SessionReport, KeyLevelBrief } from "@/types/report";
import type { EconomicEvent } from "@/types/calendar";
import type { NewsArticle } from "@/types/news";

type SetupRow = Database["public"]["Tables"]["trading_setups"]["Row"];
type ReportRow = Database["public"]["Tables"]["session_reports"]["Row"];
type EventRow = Database["public"]["Tables"]["economic_events"]["Row"];
type NewsRow = Database["public"]["Tables"]["market_news"]["Row"];

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
```

---

### 6. Upgrade Calendar Service Controller (`lib/services/calendar.ts`)
Query Supabase first with automatic offline fallback to local mock events.

**File:** `lib/services/calendar.ts`
```typescript
import type { EconomicEvent } from "@/types/calendar";
import { MOCK_EVENTS } from "@/lib/mock/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToEvent } from "@/lib/supabase/mappers";

/**
 * Single entry point for economic calendar data.
 * Queries Supabase first; falls back to mock events if offline or database empty.
 */
export async function getEconomicEvents(): Promise<EconomicEvent[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("economic_events")
      .select("*")
      .order("scheduled_at", { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase economic events query error, using mock fallback:", error.message);
      return [...MOCK_EVENTS].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    }

    return data.map(mapRowToEvent);
  } catch (err) {
    console.warn("Supabase client unavailable, using mock events fallback:", err instanceof Error ? err.message : err);
    return [...MOCK_EVENTS].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }
}
```

---

### 7. Upgrade News Service Controller (`lib/services/news.ts`)
Query Supabase first with automatic offline fallback to local mock news articles.

**File:** `lib/services/news.ts`
```typescript
import type { NewsArticle } from "@/types/news";
import { MOCK_NEWS } from "@/lib/mock/news";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapRowToNews } from "@/lib/supabase/mappers";

/**
 * Single entry point for market news feed.
 * Queries Supabase first; falls back to mock news if offline or database empty.
 */
export async function getNews(): Promise<NewsArticle[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("market_news")
      .select("*")
      .order("published_at", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase market news query error, using mock fallback:", error.message);
      return [...MOCK_NEWS].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }

    return data.map(mapRowToNews);
  } catch (err) {
    console.warn("Supabase client unavailable, using mock news fallback:", err instanceof Error ? err.message : err);
    return [...MOCK_NEWS].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }
}
```

---

## 🧪 Verification & Testing
1. Run `node tools/merge.js` to compile the consolidated `supabase/schema.sql`.
2. Verify that `npx tsc --noEmit` exits with 0 errors.
3. Navigate to `/calendar` and `/news` to confirm pages load without interruption, seamlessly pulling from Supabase or falling back to mock fixtures if offline.

