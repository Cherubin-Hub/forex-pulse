"use server";

import { revalidatePath } from "next/cache";
import { scanMarketOpportunities } from "@/lib/services/strategyScanner";
import { createTradingSetup, type UpdateStatusResult } from "@/app/actions/setupActions";
import type { ScannedOpportunity, ScannerFilterConfig, ScannerRunResult } from "@/types/scanner";
import type { CreateSetupFormData } from "@/lib/schemas/setup";

export interface ScanActionResult {
  success: boolean;
  result?: ScannerRunResult;
  error?: string;
}

/**
 * Server Action: Scans the market on the server tailored to the user's active trader profile.
 * Automatically loads user settings (SCALPER, DAY_TRADER, SWING_TRADER) if not explicitly provided.
 */
export async function runMarketScanAction(
  config?: Partial<ScannerFilterConfig>
): Promise<ScanActionResult> {
  try {
    const effectiveConfig: Partial<ScannerFilterConfig> = { ...config };

    // Dynamically resolve trader profile from the user's cloud settings if not provided
    if (!effectiveConfig.traderProfile) {
      const { fetchCloudSettings } = await import("@/app/actions/settingsActions");
      const settingsRes = await fetchCloudSettings();
      if (settingsRes.success && settingsRes.data?.traderProfile) {
        effectiveConfig.traderProfile = settingsRes.data.traderProfile;
        if (settingsRes.data.minRiskReward && !effectiveConfig.minRiskReward) {
          effectiveConfig.minRiskReward = settingsRes.data.minRiskReward;
        }
      }
    }

    const scanResult = await scanMarketOpportunities(effectiveConfig);

    // Auto-commit mode: Immediately write setups to Supabase if enabled
    if (effectiveConfig.autoCommit && scanResult.opportunities.length > 0) {
      let committed = 0;
      for (const opp of scanResult.opportunities) {
        const commitRes = await commitScannedSetupAction(opp);
        if (commitRes.success) committed++;
      }
      scanResult.committedCount = committed;
    }

    return { success: true, result: scanResult };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Market scan execution failed";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Approves and persists a single discovered opportunity into Supabase.
 */
export async function commitScannedSetupAction(
  opportunity: ScannedOpportunity
): Promise<UpdateStatusResult> {
  try {
    const formData: CreateSetupFormData = {
      symbol: opportunity.symbol,
      direction: opportunity.direction,
      entryMin: opportunity.entryMin,
      entryMax: opportunity.entryMax,
      stopLoss: opportunity.stopLoss,
      takeProfit1: opportunity.takeProfit1,
      invalidationRule: opportunity.invalidationRule,
      notes: opportunity.notes,
      confluenceTags: opportunity.confluenceTags.join(", "),
    };

    const res = await createTradingSetup(formData);

    if (res.success) {
      revalidatePath("/setups");
      revalidatePath("/dashboard");
      revalidatePath("/");
    }

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to persist scanned setup";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Triggers an immediate 24/7 autonomous cycle directly on the server.
 */
export async function triggerHeadlessCycleAction() {
  try {
    const { executeHeadlessAutomationCycle } = await import(
      "@/lib/services/headlessAutomationEngine"
    );
    const result = await executeHeadlessAutomationCycle();
    revalidatePath("/setups");
    revalidatePath("/dashboard");
    revalidatePath("/");
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to execute headless cycle";
    return {
      success: false,
      timestamp: new Date().toISOString(),
      scannedSymbols: 0,
      opportunitiesFound: 0,
      setupsCreated: 0,
      setupsUpdated: 0,
      activeUsersCount: 0,
      durationMs: 0,
      error: message,
    };
  }
}
