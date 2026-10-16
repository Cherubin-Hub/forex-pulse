"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQuotes } from "@/lib/services/marketData";
import { getEconomicEvents } from "@/lib/services/calendar";
import { getActiveSetups } from "@/lib/services/setups";
import { mapRowToReport } from "@/lib/supabase/mappers";
import { getZonedParts } from "@/lib/sessions";
import { getAuthenticatedUserId } from "@/lib/auth/user";
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

export interface AutoReportResult {
  success: boolean;
  generated: boolean;
  session?: SessionType;
  report?: SessionReport;
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
    const supabase = createAdminClient();

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

    const userId = await getAuthenticatedUserId();

    const playbookData = {
      focusPairs,
      riskRule,
      tradeOpportunities,
      userId,
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
    const userId = await getAuthenticatedUserId();
    const supabase = createAdminClient();

    let query = supabase.from("session_reports").delete().eq("id", reportId);
    if (userId) {
      query = query.eq("playbook->>userId", userId);
    }

    const { error } = await query;

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

/**
 * Resolves the active session and its exact window opening time in UTC.
 * Sessions in PHT (Asia/Manila, UTC+8):
 * - ASIAN_WRAP: 07:00 - 14:59 PHT (opens 07:00 PHT)
 * - LONDON_OPEN: 15:00 - 19:59 PHT (opens 15:00 PHT)
 * - NEW_YORK_OPEN: 20:00 - 06:59 PHT (opens 20:00 PHT)
 */
function getCurrentSessionWindow(now = new Date()): {
  session: SessionType;
  windowStart: Date;
} {
  const pht = getZonedParts(now, "Asia/Manila");
  let session: SessionType;
  let startYear = pht.year;
  let startMonth = pht.month;
  let startDay = pht.day;
  let startHour: number;

  if (pht.hour >= 7 && pht.hour < 15) {
    session = "ASIAN_WRAP";
    startHour = 7;
  } else if (pht.hour >= 15 && pht.hour < 20) {
    session = "LONDON_OPEN";
    startHour = 15;
  } else {
    session = "NEW_YORK_OPEN";
    startHour = 20;
    if (pht.hour < 7) {
      // Early morning hours (00:00 - 06:59 PHT) belong to the NY session that opened at 20:00 on the previous calendar day
      startDay = pht.day - 1;
    }
  }

  // Manila is UTC+8 with no DST offset. startMonth is 1-indexed, so -1 for Date.UTC
  const windowStart = new Date(Date.UTC(startYear, startMonth - 1, startDay, startHour - 8, 0, 0));
  return { session, windowStart };
}

/**
 * Checks if an institutional report for the current trading session has already been generated.
 * If missing, automatically synthesizes and publishes it to Supabase and posts a system notification.
 */
export async function autoGenerateSessionReportAction(): Promise<AutoReportResult> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return { success: false, generated: false, error: "Unauthenticated" };
    }

    const supabase = createAdminClient();
    const { session, windowStart } = getCurrentSessionWindow();

    // 1. Check if a report for this session was already created within this session window FOR THIS USER
    const { data: existing, error: checkError } = await supabase
      .from("session_reports")
      .select("id, title, session, timestamp")
      .eq("session", session)
      .eq("playbook->>userId", userId)
      .gte("timestamp", windowStart.toISOString())
      .limit(1);

    if (checkError) {
      console.warn("[AutoReport] Verification query warning:", checkError.message);
    }

    if (existing && existing.length > 0) {
      return { success: true, generated: false, session };
    }

    // 2. Synthesize new report for the current active session
    const reportRes = await generateSessionReport(session);
    if (!reportRes.success || !reportRes.data) {
      return {
        success: false,
        generated: false,
        session,
        error: reportRes.error ?? "Failed to synthesize report",
      };
    }

    // 3. Post notification to the Universal Notification Center for this user
    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "SESSION_ALERT",
        priority: "INFO",
        title: `Institutional Briefing: ${session.replace("_", " ")}`,
        message: reportRes.data.title,
        link_href: "/reports",
        action_label: "View Report",
        read: false,
      });
    } catch (notifErr) {
      console.warn("[AutoReport] Failed to log notification:", notifErr);
    }

    revalidatePath("/reports");
    revalidatePath("/");

    return {
      success: true,
      generated: true,
      session,
      report: reportRes.data,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Auto-report generation failed";
    console.error("[AutoReport] Execution error:", message);
    return { success: false, generated: false, error: message };
  }
}

