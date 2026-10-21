import "server-only";
import { getNewsWindows } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { scanMarketOpportunities } from "@/lib/services/strategyScanner";
import { getQuotes } from "@/lib/services/marketData";
import { getUserSettings } from "@/lib/services/userSettings";
import {
  createSetupForUser,
  resolveSetupForUser,
} from "@/lib/services/trading";
import { isVerifiedQuote, isDemoMode } from "@/lib/marketQuality";
import { isForexMarketOpen } from "@/lib/sessions";
import type { HeadlessCycleResult } from "@/types/action";
export type { HeadlessCycleResult } from "@/types/action";
export async function executeHeadlessAutomationCycle(
  onlyUserId?: string,
): Promise<HeadlessCycleResult> {
  const started = Date.now();
  const result: HeadlessCycleResult = {
    success: true,
    timestamp: new Date().toISOString(),
    scannedSymbols: 0,
    opportunitiesFound: 0,
    setupsCreated: 0,
    setupsUpdated: 0,
    activeUsersCount: 0,
    durationMs: 0,
  };
  try {
    if (isDemoMode() || !isForexMarketOpen(new Date()))
      return {
        ...result,
        error: "Automation paused: demo mode or market closed.",
      };
    const quotes = await getQuotes();
    result.scannedSymbols = quotes.filter((quote) =>
      isVerifiedQuote(quote),
    ).length;
    if (!result.scannedSymbols)
      throw new Error(
        "No fresh verified quotes are available. Automation is paused.",
      );
    const admin = createAdminClient();
    let query = admin.from("user_settings").select("user_id");
    query = onlyUserId
      ? query.eq("user_id", onlyUserId)
      : query.eq("automation_enabled", true);
    const { data: users, error } = await query;
    if (error) throw new Error(error.message);
    for (const user of users ?? []) {
      if (Date.now() - started > 45000) break;
      const settings = await getUserSettings(user.user_id);
      result.activeUsersCount++;
      const { data: rows, error: readError } = await admin
        .from("trading_setups")
        .select("id,symbol")
        .eq("user_id", user.user_id)
        .in("status", ["WAITING_FOR_CONFIRMATION", "ENTRY_TRIGGERED"]);
      if (readError) throw new Error("Portfolio query failed.");
      for (const row of rows ?? []) {
        try {
          if (await resolveSetupForUser(user.user_id, row.id))
            result.setupsUpdated++;
        } catch (error: unknown) {
          console.warn(
            "Setup resolution paused:",
            error instanceof Error ? error.message : "Unavailable",
          );
        }
      }
      if (!settings.automationEnabled) continue;
      const scanned = await scanMarketOpportunities(
        {
          traderProfile: settings.traderProfile,
          minRiskReward: settings.minRiskReward,
          newsWindows: getNewsWindows(settings),
          enableNewsFilter: true,
          autoCommit: false,
        },
        (rows ?? []).map((row) => row.symbol),
      );
      result.opportunitiesFound += scanned.opportunities.length;
      for (const opportunity of scanned.opportunities) {
        if (Date.now() - started > 45000) break;
        try {
          await createSetupForUser(user.user_id, {
            ...opportunity,
            confluenceTags: opportunity.confluenceTags.join(", "),
          });
          result.setupsCreated++;
        } catch (error: unknown) {
          console.warn(
            "Setup commit paused:",
            error instanceof Error ? error.message : "Unavailable",
          );
        }
      }
    }
    return { ...result, durationMs: Date.now() - started };
  } catch (error: unknown) {
    return {
      ...result,
      success: false,
      error: error instanceof Error ? error.message : "Automation failed",
      durationMs: Date.now() - started,
    };
  }
}
