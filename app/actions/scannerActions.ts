"use server";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/user";
import { scanMarketOpportunities } from "@/lib/services/strategyScanner";
import { getUserSettings } from "@/lib/services/userSettings";
import { createSetupForUser } from "@/lib/services/trading";
import { getNewsWindows } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  scannerConfigSchema,
  scannedOpportunitySchema,
} from "@/lib/schemas/scanner";
import { executeHeadlessAutomationCycle } from "@/lib/services/headlessAutomationEngine";
import type {
  ScannedOpportunity,
  ScannerFilterConfig,
  ScannerRunResult,
} from "@/types/scanner";
import type { UpdateStatusResult, HeadlessCycleResult } from "@/types/action";
export async function runMarketScanAction(
  input?: Partial<ScannerFilterConfig>,
): Promise<{ success: boolean; result?: ScannerRunResult; error?: string }> {
  try {
    const userId = await requireUserId(),
      settings = await getUserSettings(userId),
      config = scannerConfigSchema.parse(input ?? {});
    const { data, error } = await createAdminClient()
      .from("trading_setups")
      .select("symbol")
      .eq("user_id", userId)
      .in("status", ["WAITING_FOR_CONFIRMATION", "ENTRY_TRIGGERED"]);
    if (error) throw new Error("Portfolio unavailable.");
    const result = await scanMarketOpportunities(
      {
        ...config,
        traderProfile: settings.traderProfile,
        minRiskReward: Math.max(
          config.minRiskReward ?? settings.minRiskReward,
          settings.minRiskReward,
        ),
        autoCommit: false,
        newsWindows: getNewsWindows(settings),
        enableNewsFilter: true,
      },
      (data ?? []).map((row) => row.symbol),
    );
    // Scanning never writes. Automatic commits run through the account's saved opt-in.
    return { success: true, result };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Scan failed",
    };
  }
}
export async function commitScannedSetupAction(
  input: ScannedOpportunity,
): Promise<UpdateStatusResult> {
  try {
    const userId = await requireUserId(),
      opportunity = scannedOpportunitySchema.parse(input);
    if (Date.now() - Date.parse(opportunity.detectedAt) > 120000)
      throw new Error("Opportunity is stale. Run a new scan.");
    await createSetupForUser(userId, {
      ...opportunity,
      confluenceTags: opportunity.confluenceTags.join(", "),
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Commit failed",
    };
  }
}
export async function triggerHeadlessCycleAction(): Promise<HeadlessCycleResult> {
  try {
    const result = await executeHeadlessAutomationCycle(await requireUserId());
    revalidatePath("/", "layout");
    return result;
  } catch (error: unknown) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      scannedSymbols: 0,
      opportunitiesFound: 0,
      setupsCreated: 0,
      setupsUpdated: 0,
      activeUsersCount: 0,
      durationMs: 0,
      error: error instanceof Error ? error.message : "Unauthorized",
    };
  }
}
