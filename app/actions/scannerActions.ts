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
 * Server Action: Scans the market on the server and optionally auto-commits qualifying setups.
 */
export async function runMarketScanAction(
  config?: Partial<ScannerFilterConfig>
): Promise<ScanActionResult> {
  try {
    const scanResult = await scanMarketOpportunities(config);

    // Auto-commit mode: Immediately write setups to Supabase if enabled
    if (config?.autoCommit && scanResult.opportunities.length > 0) {
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
      revalidatePath("/");
    }

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to persist scanned setup";
    return { success: false, error: message };
  }
}
