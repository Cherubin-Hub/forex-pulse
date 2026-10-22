"use server";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserSettings } from "@/lib/services/userSettings";
import { getQuotes } from "@/lib/services/marketData";
import { getCalendarSnapshot } from "@/lib/services/calendar";
import { getActiveSetups } from "@/lib/services/setups";
import { mapRowToReport } from "@/lib/supabase/mappers";
import { isVerifiedQuote } from "@/lib/marketQuality";
import { calculateDailyPivots } from "@/lib/technicalUtils";
import { formatDayKeyPHT, formatPercent } from "@/lib/formatters";
import { getCurrentSessionWindow, getSessionWindow } from "@/lib/reportUtils";
import { sessionTypeSchema } from "@/lib/schemas/report";
import { generateGeminiSessionBriefing } from "@/lib/services/gemini";
import type {
  SessionType,
  MarketBias,
  VolatilityExpectation,
  KeyLevelBrief,
} from "@/types/report";
import type { Json } from "@/types/database";
export type { ReportActionResult, AutoReportResult } from "@/types/action";
import type { ReportActionResult, AutoReportResult } from "@/types/action";
export async function generateSessionReport(
  session: SessionType,
): Promise<ReportActionResult> {
  try {
    sessionTypeSchema.parse(session);
    const userId = await requireUserId();
    const [quotes, calendar, setups, settings] = await Promise.all([
      getQuotes(),
      getCalendarSnapshot(),
      getActiveSetups(),
      getUserSettings(userId),
    ]);
    const verified = quotes.filter((quote) => isVerifiedQuote(quote));
    if (verified.length === 0 || !calendar.available)
      throw new Error(
        "Fresh verified quotes and calendar coverage are required to generate a report.",
      );
    const eur = verified.find((quote) => quote.symbol === "EURUSD"),
      jpy = verified.find((quote) => quote.symbol === "USDJPY");
    let bias: MarketBias = "NEUTRAL";
    if (
      eur?.price != null &&
      eur.previousClose != null &&
      jpy?.price != null &&
      jpy.previousClose != null
    ) {
      if (eur.price < eur.previousClose && jpy.price > jpy.previousClose)
        bias = "BULLISH_USD";
      else if (eur.price > eur.previousClose && jpy.price < jpy.previousClose)
        bias = "BEARISH_USD";
    }
    const events = calendar.events.filter(
      (event) =>
        event.status === "LIVE" &&
        formatDayKeyPHT(event.scheduledAt) === formatDayKeyPHT(new Date()),
    );
    const highCount = events.filter((event) => event.impact === "HIGH").length;
    const volatility: VolatilityExpectation =
      highCount >= 2 ? "EXTREME" : highCount === 1 ? "HIGH" : "NORMAL";
    const keyLevels: KeyLevelBrief[] = verified.flatMap((quote) => {
      const levels = calculateDailyPivots(quote, 1);
      return levels
        ? [
            {
              symbol: quote.symbol,
              pivot: levels.pivot,
              support: levels.s1,
              resistance: levels.r1,
              bias: quote.bias,
            },
          ]
        : [];
    });
    const windowStart = getSessionWindow(session);
    const highEvents = events.filter((event) => event.impact === "HIGH");
    const riskRuleText = `Maximum ${formatPercent(settings.riskPerTradePercent)} per setup; minimum ${settings.minRiskReward}R; daily loss limit ${settings.maxDailyLossR}R.`;

    // Institutional AI Synthesis with Google Gemini Flash (Free Tier)
    const aiBriefing = await generateGeminiSessionBriefing({
      session,
      verifiedQuotes: verified.map((q) => ({
        symbol: q.symbol,
        price: q.price,
        previousClose: q.previousClose,
        bias: q.bias,
      })),
      calendarEvents: highEvents.map((e) => ({
        title: e.title,
        currency: e.currency,
        impact: e.impact,
        scheduledAt: e.scheduledAt,
      })),
      activeSetups: setups.map((s) => ({
        symbol: s.symbol,
        direction: s.direction,
        confluences: s.confluenceTags,
      })),
      riskRules: riskRuleText,
    });

    const finalBias = aiBriefing?.bias ?? bias;
    const finalVolatility = aiBriefing?.volatility ?? volatility;
    const finalExecutiveSummary =
      aiBriefing?.executiveSummary ??
      `Snapshot from ${verified.length} verified instruments. ${highCount} high-impact events scheduled today in Manila time. This briefing summarizes available data; it does not confirm broker executions.`;
    const focusPairs =
      aiBriefing?.focusPairs && aiBriefing.focusPairs.length > 0
        ? aiBriefing.focusPairs
        : [...new Set(setups.map((setup) => setup.symbol))];
    const tradeOpportunities =
      aiBriefing?.tradeOpportunities && aiBriefing.tradeOpportunities.length > 0
        ? aiBriefing.tradeOpportunities
        : setups.map(
            (setup) =>
              `${setup.symbol} ${setup.direction}: ${setup.confluenceTags.join(", ")}`,
          );

    const payload = {
      owner_id: userId,
      session_window: windowStart.toISOString(),
      session,
      title: `${session.replaceAll("_", " ")}: ${aiBriefing ? "AI synthesized briefing" : "Verified market briefing"}`,
      bias: finalBias,
      volatility: finalVolatility,
      executive_summary: finalExecutiveSummary,
      macro_catalysts: highEvents.map((event) => `${event.currency}: ${event.title}`),
      key_levels: keyLevels as unknown as Json,
      playbook: {
        userId,
        focusPairs,
        riskRule: riskRuleText,
        tradeOpportunities,
      } as Json,
    };
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("session_reports")
      .insert(payload)
      .select()
      .single();
    if (error?.code === "23505") {
      const existing = await admin
        .from("session_reports")
        .select("*")
        .eq("owner_id", userId)
        .eq("session", session)
        .eq("session_window", windowStart.toISOString())
        .single();
      if (existing.error || !existing.data)
        throw new Error("Report could not be loaded.");
      return { success: true, data: mapRowToReport(existing.data) };
    }
    if (error || !data)
      throw new Error(error?.message ?? "Report could not be saved.");
    revalidatePath("/", "layout");
    return { success: true, data: mapRowToReport(data) };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Report generation failed",
    };
  }
}
export async function deleteSessionReport(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    const { error } = await createAdminClient()
      .from("session_reports")
      .delete()
      .eq("id", id)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}
export async function autoGenerateSessionReportAction(): Promise<AutoReportResult> {
  try {
    const userId = await requireUserId(),
      settings = await getUserSettings(userId);
    if (!settings.automationEnabled) return { success: true, generated: false };
    const { session, windowStart } = getCurrentSessionWindow();
    const { data, error } = await createAdminClient()
      .from("session_reports")
      .select("id")
      .eq("owner_id", userId)
      .eq("session", session)
      .eq("session_window", windowStart.toISOString())
      .limit(1);
    if (error) throw new Error(error.message);
    if (data?.length) return { success: true, generated: false, session };
    const result = await generateSessionReport(session);
    return {
      success: result.success,
      generated: result.success,
      session,
      report: result.data,
      error: result.error,
    };
  } catch (error: unknown) {
    return {
      success: false,
      generated: false,
      error:
        error instanceof Error ? error.message : "Report generation failed",
    };
  }
}
