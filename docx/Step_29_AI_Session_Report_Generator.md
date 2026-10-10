# Step 29: AI Session Report Generator & Cloud Publisher

## 🎯 Objective
Empower traders to generate institutional-grade pre-session briefings on demand through the Session Reports Hub (`/reports`). The algorithmic synthesis engine evaluates real-time currency quotes, scheduled economic events, and active setups to diagnose market regime (Bullish/Bearish USD, Risk-On/Risk-Off), evaluate session volatility expectations, calculate key pivot levels for major pairs, and formulate an objective execution playbook before market open.

---

## 🛠 Step-by-Step Implementation

### 1. Update Session Reports RLS Policies (`supabase/schema/04_policies/02_rls_session_reports.sql`)
Enable authenticated users to insert newly synthesized session reports and delete archived reports.

**File:** `supabase/schema/04_policies/02_rls_session_reports.sql`
```sql
-- ============================================================================
-- SCRIPT: 02_rls_session_reports.sql
-- TYPE:   Security Policy (RLS)
-- TABLE:  public.session_reports
-- ============================================================================

BEGIN;

ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read session_reports" ON public.session_reports;
DROP POLICY IF EXISTS "Authenticated insert session_reports" ON public.session_reports;
DROP POLICY IF EXISTS "Authenticated delete session_reports" ON public.session_reports;

-- Public read access for institutional macro briefs
CREATE POLICY "Public read session_reports" ON public.session_reports
    FOR SELECT USING (true);

-- Authenticated users can publish new session reports
CREATE POLICY "Authenticated insert session_reports" ON public.session_reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete session reports
CREATE POLICY "Authenticated delete session_reports" ON public.session_reports
    FOR DELETE USING (auth.role() = 'authenticated');

COMMIT;
```

#### Why this was written this way:
- **Write Authorization:** Previously, only `SELECT` was permitted on `session_reports`. Adding `INSERT` and `DELETE` with `auth.role() = 'authenticated'` enables authorized session reporting while safeguarding against anonymous database manipulation.

---

### 2. Create Session Report Server Actions (`app/actions/reportActions.ts`)
Create server actions that synthesize live market data, calculate pivot corridors, and persist the generated report into Supabase using `mapRowToReport` for type-safe database mapping.

**File:** `app/actions/reportActions.ts`
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getQuotes } from "@/lib/services/marketData";
import { getEconomicEvents } from "@/lib/services/calendar";
import { getActiveSetups } from "@/lib/services/setups";
import { mapRowToReport } from "@/lib/supabase/mappers";
import type { Json } from "@/types/database";
import type { 
  SessionType, 
  SessionReport, 
  MarketBias, 
  VolatilityExpectation, 
  KeyLevelBrief 
} from "@/types/report";

export interface ReportActionResult {
  success: boolean;
  data?: SessionReport;
  error?: string;
}

/**
 * Synthesizes real-time quotes, economic calendar catalysts, and setups
 * into an institutional pre-session briefing, persisting directly to Supabase.
 */
export async function generateSessionReport(
  session: SessionType
): Promise<ReportActionResult> {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in to publish reports." };
    }

    // 2. Fetch cross-module live intelligence in parallel
    const [quotes, events, setups] = await Promise.all([
      getQuotes(),
      getEconomicEvents(),
      getActiveSetups(),
    ]);

    // 3. Diagnose Market Bias based on USD Majors & Gold
    const eurusd = quotes.find((q) => q.symbol === "EURUSD");
    const usdjpy = quotes.find((q) => q.symbol === "USDJPY");
    const gold = quotes.find((q) => q.symbol === "XAUUSD");

    const isEurBearish = (eurusd?.price ?? 0) < (eurusd?.previousClose ?? 0);
    const isJpyBullish = (usdjpy?.price ?? 0) > (usdjpy?.previousClose ?? 0);
    const isGoldSurging = (gold?.price ?? 0) > (gold?.previousClose ?? 0);

    let bias: MarketBias = "NEUTRAL";
    if (isEurBearish && isJpyBullish) {
      bias = "BULLISH_USD";
    } else if (!isEurBearish && !isJpyBullish) {
      bias = "BEARISH_USD";
    } else if (isGoldSurging) {
      bias = "RISK_OFF";
    } else {
      bias = "RISK_ON";
    }

    // 4. Evaluate Volatility Expectation from High-Impact Events
    const today = new Date().toISOString().split("T")[0];
    const todaysEvents = events.filter((e) => e.scheduledAt.startsWith(today));
    const highImpactCount = todaysEvents.filter((e) => e.impact === "HIGH").length;

    let volatility: VolatilityExpectation = "NORMAL";
    if (highImpactCount >= 2) {
      volatility = "EXTREME";
    } else if (highImpactCount === 1) {
      volatility = "HIGH";
    } else if (todaysEvents.length === 0) {
      volatility = "LOW";
    }

    // 5. Compute Pivot Corridors for Watchlist Pairs
    const keyPairs = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"];
    const keyLevels: KeyLevelBrief[] = keyPairs.map((sym) => {
      const q = quotes.find((quote) => quote.symbol === sym);
      const price = q?.price ?? (sym === "XAUUSD" ? 2650 : sym === "USDJPY" ? 149.0 : 1.12);
      const isGold = sym === "XAUUSD";
      const isJpy = sym === "USDJPY";

      const spread = isGold ? 15.0 : isJpy ? 0.6 : 0.0045;
      const roundFactor = isGold ? 2 : isJpy ? 3 : 5;

      return {
        symbol: sym,
        pivot: Number(price.toFixed(roundFactor)),
        support: Number((price - spread).toFixed(roundFactor)),
        resistance: Number((price + spread).toFixed(roundFactor)),
        bias: q?.bias ?? "NEUTRAL",
      };
    });

    // 6. Formulate Macro Title & Executive Summary
    const sessionLabel = session.replace("_", " ");
    const title = `${sessionLabel}: ${bias.replace("_", " ")} Momentum & Volatility Playbook`;

    const highImpactTitles = todaysEvents
      .filter((e) => e.impact === "HIGH")
      .map((e) => `${e.currency} ${e.title}`);

    const macroCatalysts = highImpactTitles.length > 0
      ? highImpactTitles
      : [
          "Interbank Liquidity Flow across European financial centers.",
          "Bond Yield Rebalancing & Currency Reserve Adjustments.",
          "Intra-day Range Expansion targeting Asian session liquidity pools.",
        ];

    const activeSymbols = setups.map((s) => s.symbol);
    const focusPairs = activeSymbols.length > 0 ? Array.from(new Set(activeSymbols)) : ["EURUSD", "XAUUSD"];

    const executiveSummary = `Institutional briefing for ${sessionLabel}. Market structure indicates a ${bias.replace(
      "_",
      " "
    )} environment with ${volatility.toLowerCase()} volatility expectations. Traders should maintain strict discipline around pre-defined order blocks and avoid chasing breakouts ahead of high-tier releases.`;

    const riskRule = volatility === "EXTREME"
      ? "HIGH NEWS RISK: Maximum 0.5% risk per trade. Protect stops prior to scheduled data."
      : "Standard Risk: 1.0% maximum risk per setup. Minimum 1:2.0 R:R adherence required.";

    const tradeOpportunities = setups.length > 0
      ? setups.map((s) => `${s.symbol} ${s.direction} (${s.confluenceTags.join(", ")})`)
      : ["EURUSD liquidity sweep of Asian Session Lows", "XAU/USD pullback into H1 Bullish Fair Value Gap"];

    const playbookData = {
      focusPairs,
      riskRule,
      tradeOpportunities,
    };

    // 7. Persist to Supabase
    const { data: inserted, error: insertError } = await supabase
      .from("session_reports")
      .insert({
        title,
        session,
        bias,
        volatility,
        executive_summary: executiveSummary,
        macro_catalysts: macroCatalysts,
        key_levels: keyLevels as unknown as Json,
        playbook: playbookData as unknown as Json,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("Failed to persist session report:", insertError?.message);
      return { success: false, error: insertError?.message ?? "Insert failed" };
    }

    // 8. Revalidate paths
    revalidatePath("/reports");
    revalidatePath("/");

    return { 
      success: true, 
      data: mapRowToReport(inserted),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate report";
    return { success: false, error: message };
  }
}

/**
 * Server Action to delete an archived session report.
 */
export async function deleteSessionReport(reportId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("session_reports")
      .delete()
      .eq("id", reportId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/reports");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete report";
    return { success: false, error: message };
  }
}
```

#### Why this was written this way:
- **`mapRowToReport` Integration:** Automatically resolves PostgreSQL `Json` columns (`key_levels` and `playbook`) to their strongly typed domain models (`KeyLevelBrief[]` and `SessionReport["playbook"]`), avoiding manual property re-mapping or index signature type mismatches.
- **Type-Safe JSON Casts:** Casting `keyLevels as unknown as Json` conforms strictly to the Supabase Database client interface definition without requiring broad type mutations.

---

### 3. Create Session Report Generator Modal (`components/reports/GenerateReportModal.tsx`)
Create an interactive modal allowing traders to trigger synthesis for the chosen session (London Open, New York Open, Asian Wrap) with loading spinners and feedback.

**File:** `components/reports/GenerateReportModal.tsx`
```tsx
"use client";

import { useState, useTransition } from "react";
import { Sparkles, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { SessionType } from "@/types/report";
import { generateSessionReport } from "@/app/actions/reportActions";
import { Button } from "@/components/ui/button";

const SESSIONS: { type: SessionType; label: string; desc: string }[] = [
  {
    type: "LONDON_OPEN",
    label: "London Open",
    desc: "3:00 PM PHT — Focus on EUR, GBP liquidity sweeps and morning range expansion.",
  },
  {
    type: "NEW_YORK_OPEN",
    label: "New York Open",
    desc: "8:00 PM PHT — Focus on USD catalysts, London overlap, and US equity market opens.",
  },
  {
    type: "ASIAN_WRAP",
    label: "Asian Wrap",
    desc: "7:00 AM PHT — Asian range consolidation, Tokyo fix, and day structure setup.",
  },
];

export function GenerateReportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionType>("LONDON_OPEN");
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleGenerate = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const result = await generateSessionReport(selectedSession);
      if (result.success) {
        setStatusMessage({ type: "success", text: "Session report synthesized and published successfully!" });
        setTimeout(() => {
          setIsOpen(false);
          setStatusMessage(null);
        }, 1200);
      } else {
        setStatusMessage({ type: "error", text: result.error ?? "Failed to generate session report." });
      }
    });
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="h-9 gap-1.5 text-xs font-semibold">
        <Sparkles className="h-4 w-4" />
        Generate Report
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Session Intelligence Engine
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Synthesize live quotes, economic calendars, and open setups into an executive brief.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Session Selector */}
            <div className="mt-4 space-y-3">
              <label className="text-xs font-semibold text-foreground">
                Select Target Trading Session:
              </label>
              <div className="grid gap-2">
                {SESSIONS.map((s) => {
                  const isSelected = selectedSession === s.type;
                  return (
                    <div
                      key={s.type}
                      onClick={() => setSelectedSession(s.type)}
                      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground">{s.label}</span>
                        {isSelected && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed">{s.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Alert */}
            {statusMessage && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-xs ${
                  statusMessage.type === "success"
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Footer Actions */}
            <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={isPending}
                className="gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Synthesizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Synthesize & Publish
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

#### Why this was written this way:
- **Tailwind Modal Architecture:** Zero third-party library baggage with high-contrast backdrop blur, satisfying project strict hydration standards.
- **Session Intent Selector:** Traders can generate custom briefs tailored to their active trading block (London, New York, or Asian wrap).
- **`useTransition` Feedback:** Disables double-submissions and provides a real-time spinning indicator while the server action queries Supabase and updates the cache.

---

### 4. Integrate Generator & Delete Controls into Reports Hub (`components/reports/ReportCard.tsx` & `app/(dashboard)/reports/page.tsx`)

#### A. Add Delete Capability to [`components/reports/ReportCard.tsx`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/components/reports/ReportCard.tsx)
Add the delete button to the footer of the `ReportCard` component so traders can easily purge obsolete briefs.

In `components/reports/ReportCard.tsx`, import `deleteSessionReport` and add the delete action button:

```tsx
// Inside components/reports/ReportCard.tsx
import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteSessionReport } from "@/app/actions/reportActions";
import { Button } from "@/components/ui/button";

// Add inside ReportCard component:
const [isDeleting, startDelete] = useTransition();

const handleDelete = () => {
  if (!confirm("Delete this session report?")) return;
  startDelete(async () => {
    await deleteSessionReport(report.id);
  });
};
```

#### B. Update Reports Page Route (`app/(dashboard)/reports/page.tsx`)
Embed `<GenerateReportModal />` in the page header:

**File:** `app/(dashboard)/reports/page.tsx`
```tsx
import { FileText } from "lucide-react";
import { getSessionReports } from "@/lib/services/reports";
import { ReportsView } from "@/components/reports/ReportsView";
import { GenerateReportModal } from "@/components/reports/GenerateReportModal";

export default async function ReportsPage() {
  const reports = await getSessionReports();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Session Reports & Intelligence
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pre-session institutional briefings, liquidity zones, and risk directives.
          </p>
        </div>

        <GenerateReportModal />
      </div>

      <ReportsView reports={reports} />
    </div>
  );
}
```

---

## 🧪 Verification & Testing
1. Navigate to `http://localhost:3000/reports` via the sidebar navigation.
2. Click the new **Generate Report** button in the top-right header.
3. Select **London Open** and click **Synthesize & Publish**.
4. Confirm that the synthesis completes and the new report immediately appears as the active report on the screen.
5. Verify that Key Pivot Levels, Market Bias, Volatility Rating, and Macro Catalysts reflect the current session state.
