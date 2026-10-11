# Step 51: Automated Macro Cron Engine & Vercel Scheduled Tasks

## 🎯 Objective
Empower Forex Pulse with hands-free, autonomous macro intelligence by introducing the **Automated Macro Cron Engine & Vercel Scheduled Tasks** (`/api/cron/daily-report`). 

In institutional trading desks, session outlooks and risk playbooks are synthesized and distributed automatically ahead of market opens without requiring manual user intervention. This step delivers:
1. **Unified Report Synthesis Engine (`lib/reports/reportGenerator.ts`):** Extracts clean, pure algorithmic logic for analyzing USD currency bias, macro volatility tiers, pivot corridors, and risk rules from cross-module live data.
2. **Automated Cron API Route (`app/api/cron/daily-report/route.ts`):** Authenticated endpoint protected by `CRON_SECRET` that can be triggered by external cron services or Vercel Cron.
3. **Vercel Cron Configuration (`vercel.json`):** Configures recurring cron tasks ahead of Tokyo Open (00:00 UTC), London Open (07:00 UTC), and New York Open (12:00 UTC) Monday through Friday.

---

## 🛠 Step-by-Step Implementation

### 1. Extract Report Synthesis Engine (`lib/reports/reportGenerator.ts`)
Create a dedicated synthesis utility that transforms market quotes, economic events, and active setups into an institutional briefing.

**File:** `lib/reports/reportGenerator.ts`
```typescript
import type { PriceQuote } from "@/types/market";
import type { EconomicEvent } from "@/types/calendar";
import type { TradingSetup } from "@/types/setup";
import type { 
  SessionType, 
  SessionReport, 
  MarketBias, 
  VolatilityExpectation, 
  KeyLevelBrief 
} from "@/types/report";

export type SynthesizedReportData = {
  title: string;
  session: SessionType;
  bias: MarketBias;
  volatility: VolatilityExpectation;
  executiveSummary: string;
  macroCatalysts: string[];
  keyLevels: KeyLevelBrief[];
  playbook: SessionReport["playbook"];
};

export function synthesizeSessionReportData(
  session: SessionType,
  quotes: PriceQuote[],
  events: EconomicEvent[],
  setups: TradingSetup[]
): SynthesizedReportData {
  // 1. Diagnose Market Bias based on USD Majors & Gold
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

  // 2. Evaluate Volatility Expectation from High-Impact Events
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

  // 3. Compute Pivot Corridors for Key Pairs
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

  // 4. Formulate Macro Title & Executive Summary
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

  return {
    title,
    session,
    bias,
    volatility,
    executiveSummary,
    macroCatalysts,
    keyLevels,
    playbook: {
      focusPairs,
      riskRule,
      tradeOpportunities,
    },
  };
}
```

---

### 2. Create Automated Cron API Route (`app/api/cron/daily-report/route.ts`)
Create the serverless cron handler that accepts session queries, authenticates the request, and persists the report to Supabase.

**File:** `app/api/cron/daily-report/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getQuotes } from "@/lib/services/marketData";
import { getEconomicEvents } from "@/lib/services/calendar";
import { getActiveSetups } from "@/lib/services/setups";
import { synthesizeSessionReportData } from "@/lib/reports/reportGenerator";
import type { SessionType } from "@/types/report";
import type { Database, Json } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    // 1. Verify Vercel Cron Secret (if configured)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized cron invocation" }, { status: 401 });
    }

    // 2. Parse session parameter from URL (default to LONDON_OPEN)
    const { searchParams } = new URL(request.url);
    const sessionParam = (searchParams.get("session") ?? "LONDON_OPEN") as SessionType;

    // 3. Gather live cross-module data
    const [quotes, events, setups] = await Promise.all([
      getQuotes(),
      getEconomicEvents(),
      getActiveSetups(),
    ]);

    // 4. Synthesize report
    const reportData = synthesizeSessionReportData(sessionParam, quotes, events, setups);

    // 5. Connect to Supabase using admin credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        success: true,
        message: "Report synthesized in local mode (Supabase not configured)",
        report: reportData,
      });
    }

    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

    const { data: inserted, error: insertError } = await supabase
      .from("session_reports")
      .insert({
        title: reportData.title,
        session: reportData.session,
        bias: reportData.bias,
        volatility: reportData.volatility,
        executive_summary: reportData.executiveSummary,
        macro_catalysts: reportData.macroCatalysts,
        key_levels: reportData.keyLevels as unknown as Json,
        playbook: reportData.playbook as unknown as Json,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synthesized and archived ${sessionParam} report!`,
      reportId: inserted.id,
      title: inserted.title,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron execution failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

---

### 3. Create Vercel Cron Configuration (`vercel.json`)
Configure automated scheduled triggers for Asian, London, and New York sessions.

**File:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-report?session=ASIAN_OPEN",
      "schedule": "0 0 * * 1-5"
    },
    {
      "path": "/api/cron/daily-report?session=LONDON_OPEN",
      "schedule": "0 7 * * 1-5"
    },
    {
      "path": "/api/cron/daily-report?session=NY_OPEN",
      "schedule": "0 12 * * 1-5"
    }
  ]
}
```

---

## 🧪 Verification & Testing
1. Test the cron endpoint locally:
   - Visit `http://localhost:3000/api/cron/daily-report?session=LONDON_OPEN` in your browser.
   - Verify it returns `{ "success": true, "message": "Successfully synthesized and archived LONDON_OPEN report!", ... }`.
2. Navigate to [`/reports`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/app/(dashboard)/reports/page.tsx) and observe the new automatically published report card!
3. Run `npx tsc --noEmit` to verify 0 TypeScript errors.

