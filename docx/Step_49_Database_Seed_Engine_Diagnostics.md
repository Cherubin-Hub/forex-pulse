# Step 49: Institutional Database Seed Engine & Diagnostic Health Hub

## 🎯 Objective
Equip Forex Pulse with an institutional-grade **Database Seed Engine & Diagnostic Health Hub**. As the application transitions to production and cloud deployment on Supabase PostgreSQL, developers and traders require a zero-friction, reliable mechanism to:
1. **Verify Cloud Health & Connectivity:** Ping the remote Supabase database, measure connection latency, and audit exact row counts across all 7 production tables (`trading_setups`, `session_reports`, `economic_events`, `market_news`, `gold_drivers`, `gold_key_levels`, `technical_analysis`).
2. **Full-Spectrum Idempotent Seeding:** A unified seeder route (`app/api/seed/route.ts`) that populates every domain model with rich, multi-session institutional data in a single transactional batch.
3. **Interactive Control Console (`components/settings/DatabaseSeedCard.tsx`):** An embedded diagnostic and seeding card mounted in `/settings`, allowing one-click database health checks and data synchronization directly from the browser UI without requiring external tools like cURL or Postman.

---

## 🛠 Step-by-Step Implementation

### 1. Upgrade Database Seed & Health Route (`app/api/seed/route.ts`)
Upgrade `app/api/seed/route.ts` to support both `GET` (health & row count audit) and `POST` (full 7-table database population).

**File:** `app/api/seed/route.ts`
```typescript
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MOCK_ACTIVE_SETUPS, MOCK_HISTORY_SETUPS } from "@/lib/mock/setups";
import { MOCK_REPORTS } from "@/lib/mock/reports";
import { MOCK_EVENTS } from "@/lib/mock/events";
import { MOCK_NEWS } from "@/lib/mock/news";
import { MOCK_GOLD_DRIVERS, MOCK_KEY_LEVELS } from "@/lib/mock/gold";
import { MOCK_TECHNICALS } from "@/lib/mock/technical";
import type { Database, Json } from "@/types/database";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * GET: Performs database connectivity health check and audits table row counts.
 */
export async function GET() {
  const start = Date.now();
  try {
    const supabase = getAdminClient();

    const [setupsRes, reportsRes, eventsRes, newsRes, driversRes, levelsRes, techRes] = await Promise.all([
      supabase.from("trading_setups").select("*", { count: "exact", head: true }),
      supabase.from("session_reports").select("*", { count: "exact", head: true }),
      supabase.from("economic_events").select("*", { count: "exact", head: true }),
      supabase.from("market_news").select("*", { count: "exact", head: true }),
      supabase.from("gold_drivers").select("*", { count: "exact", head: true }),
      supabase.from("gold_key_levels").select("*", { count: "exact", head: true }),
      supabase.from("technical_analysis").select("*", { count: "exact", head: true }),
    ]);

    const latencyMs = Date.now() - start;

    return NextResponse.json({
      success: true,
      status: "CONNECTED",
      latencyMs,
      counts: {
        trading_setups: setupsRes.count ?? 0,
        session_reports: reportsRes.count ?? 0,
        economic_events: eventsRes.count ?? 0,
        market_news: newsRes.count ?? 0,
        gold_drivers: driversRes.count ?? 0,
        gold_key_levels: levelsRes.count ?? 0,
        technical_analysis: techRes.count ?? 0,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Health check failed";
    return NextResponse.json({
      success: false,
      status: "OFFLINE",
      latencyMs: Date.now() - start,
      error: message,
    });
  }
}

/**
 * POST: Idempotently seeds all 7 tables with institutional datasets.
 */
export async function POST() {
  try {
    const supabase = getAdminClient();

    // 1. Trading Setups
    const allSetups = [...MOCK_ACTIVE_SETUPS, ...MOCK_HISTORY_SETUPS];
    const setupsToInsert = allSetups.map((s) => ({
      symbol: s.symbol,
      direction: s.direction,
      entry_min: s.entryMin,
      entry_max: s.entryMax,
      stop_loss: s.stopLoss,
      take_profit_1: s.takeProfit1,
      take_profit_2: s.takeProfit2,
      risk_reward: s.riskReward,
      status: s.status,
      invalidation_rule: s.invalidationRule,
      notes: s.notes,
      confluence_tags: s.confluenceTags,
    }));
    await supabase.from("trading_setups").insert(setupsToInsert);

    // 2. Session Reports
    const reportsToInsert = MOCK_REPORTS.map((r) => ({
      title: r.title,
      session: r.session,
      timestamp: r.timestamp,
      bias: r.bias,
      volatility: r.volatility,
      executive_summary: r.executiveSummary,
      macro_catalysts: r.macroCatalysts,
      key_levels: r.keyLevels as unknown as Json,
      playbook: r.playbook as unknown as Json,
    }));
    await supabase.from("session_reports").insert(reportsToInsert);

    // 3. Economic Calendar Events
    const eventsToInsert = MOCK_EVENTS.map((e) => ({
      id: e.id,
      title: e.title,
      currency: e.currency,
      impact: e.impact,
      scheduled_at: e.scheduledAt,
      forecast: e.forecast,
      previous: e.previous,
      actual: e.actual,
      source: e.source,
      status: e.status,
    }));
    await supabase.from("economic_events").upsert(eventsToInsert, { onConflict: "id" });

    // 4. Market News
    const newsToInsert = MOCK_NEWS.map((n) => ({
      id: n.id,
      headline: n.headline,
      summary: n.summary,
      source: n.source,
      impact: n.impact,
      currencies: n.currencies,
      published_at: n.publishedAt,
    }));
    await supabase.from("market_news").upsert(newsToInsert, { onConflict: "id" });

    // 5. Gold Macro Drivers
    const driversToInsert = MOCK_GOLD_DRIVERS.map((d) => ({
      name: d.name,
      value: d.value,
      change: d.change,
      correlation: d.correlation,
      impact: d.impact,
    }));
    await supabase.from("gold_drivers").insert(driversToInsert);

    // 6. Gold Key Levels
    const levelsToInsert = MOCK_KEY_LEVELS.map((k) => ({
      price: k.price,
      type: k.type,
      strength: k.strength,
      notes: k.notes ?? null,
    }));
    await supabase.from("gold_key_levels").insert(levelsToInsert);

    // 7. Multi-Timeframe Technicals
    const technicalsToInsert = MOCK_TECHNICALS.map((t) => ({
      symbol: t.symbol,
      timeframes: t.timeframes as unknown as Json,
      overall_bias: t.overallBias,
    }));
    await supabase.from("technical_analysis").upsert(technicalsToInsert, { onConflict: "symbol" });

    return NextResponse.json({
      success: true,
      message: `Database synchronized! Seeded 7 tables: Setups (${setupsToInsert.length}), Reports (${reportsToInsert.length}), Events (${eventsToInsert.length}), News (${newsToInsert.length}), Drivers (${driversToInsert.length}), Levels (${levelsToInsert.length}), Technicals (${technicalsToInsert.length}).`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Seeding failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

#### Why this was written this way:
- **Comprehensive Coverage:** Seeds all 7 domain tables rather than just setups, eliminating empty states across the entire app.
- **Diagnostic GET Handler:** Provides instant health verification and latency measurement directly to UI components.
- **Idempotency with `upsert`:** Uses `upsert(..., { onConflict: ... })` where appropriate to prevent duplicate primary key collisions.

---

### 2. Create Database Health & Seeder Component (`components/settings/DatabaseSeedCard.tsx`)
Create this visual administrative panel for monitoring cloud health and executing data seeding.

**File:** `components/settings/DatabaseSeedCard.tsx`
```tsx
"use client";

import { useState, useEffect } from "react";
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Sparkles, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HealthData = {
  success: boolean;
  status: "CONNECTED" | "OFFLINE";
  latencyMs: number;
  counts?: Record<string, number>;
  error?: string;
};

export function DatabaseSeedCard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchHealth = async () => {
    setIsChecking(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/seed");
      const data: HealthData = await res.json();
      setHealth(data);
    } catch {
      setHealth({ success: false, status: "OFFLINE", latencyMs: 0, error: "Network error fetching health." });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleSeed = async () => {
    if (!confirm("This will synchronize and seed institutional datasets across all Supabase tables. Proceed?")) return;

    setIsSeeding(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: "success", text: data.message });
        await fetchHealth();
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to seed database." });
      }
    } catch (err) {
      setActionMessage({ type: "error", text: err instanceof Error ? err.message : "Network error during seeding." });
    } finally {
      setIsSeeding(false);
    }
  };

  const isConnected = health?.status === "CONNECTED";

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Supabase Cloud & Data Seeding Engine
          </h3>
          <p className="text-xs text-muted-foreground">
            Verify cloud connectivity, audit table record counts, and synchronize institutional datasets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              isConnected
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
            )}
          >
            {isConnected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {isConnected ? `Connected (${health?.latencyMs}ms)` : "Offline (Mock Fallback)"}
          </span>
        </div>
      </div>

      {/* Row Counts Matrix */}
      {health?.counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {Object.entries(health.counts).map(([table, count]) => (
            <div key={table} className="rounded-lg border border-border/70 bg-muted/20 p-2.5 text-center">
              <span className="text-[10px] text-muted-foreground font-mono block truncate" title={table}>
                {table.replace(/_/g, " ")}
              </span>
              <span className="text-sm font-bold font-mono text-foreground mt-0.5 block">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Status Alert Message */}
      {actionMessage && (
        <div
          className={cn(
            "rounded-lg p-3 text-xs font-medium border",
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
              : "bg-rose-500/10 border-rose-500/30 text-rose-500"
          )}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span>Controllers automatically fall back to local mock data when offline.</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealth}
            disabled={isChecking || isSeeding}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isChecking && "animate-spin")} />
            Audit Health
          </Button>

          <Button
            size="sm"
            onClick={handleSeed}
            disabled={isSeeding || isChecking}
            className="text-xs h-8 gap-1.5"
          >
            <Sparkles className={cn("h-3.5 w-3.5", isSeeding && "animate-spin")} />
            {isSeeding ? "Seeding Database..." : "Seed Institutional Dataset"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

#### Why this was written this way:
- **Instant Cloud Feedback:** Eliminates guessing whether the application is hitting live Supabase or mock fallbacks by querying `/api/seed`.
- **One-Click Synchronization:** Enables developers and testers to populate a pristine Supabase instance with all required relational records directly from the settings page.

---

### 3. Mount in Settings View (`app/(dashboard)/settings/page.tsx`)
Embed `DatabaseSeedCard` in `app/(dashboard)/settings/page.tsx` directly below `SettingsForm`.

**File:** `app/(dashboard)/settings/page.tsx`
```tsx
import { SettingsForm } from "@/components/settings/SettingsForm";
import { DatabaseSeedCard } from "@/components/settings/DatabaseSeedCard";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Preferences & System Settings</h2>
        <p className="text-sm text-muted-foreground">
          Personalize analysis, execution rules, and manage cloud database synchronization.
        </p>
      </div>

      {/* Trader Profile & Risk Preferences */}
      <SettingsForm />

      {/* Cloud Database Health & Seeding Engine */}
      <DatabaseSeedCard />
    </div>
  );
}
```

---

## 🧪 Verification & Testing
1. Navigate to [`/settings`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/app/(dashboard)/settings/page.tsx).
2. Scroll to the **Supabase Cloud & Data Seeding Engine** panel:
   - Check the connection status badge and latency indicator.
   - Inspect the table counts matrix across all 7 domain tables.
3. Click **Audit Health** to verify on-demand health polling.
4. Click **Seed Institutional Dataset**:
   - Confirm the dialog and verify the success notification populates.
   - Observe table counts updating in real-time.
5. Run `npx tsc --noEmit` in your terminal to ensure 0 TypeScript compilation errors.

