# Step 22: Server Actions for Trade Management & Calculations

## 🎯 Overview
In this step, we implement Next.js Server Actions to execute trade creation and status transitions directly on the server, enforcing tamper-proof mathematical risk-to-reward calculations and triggering instantaneous Next.js cache revalidations.

---

### 1. Risk-to-Reward Math Utilities (`lib/setupUtils.ts`)

Encapsulates mathematical validation for trade entries and targets.

**File:** `lib/setupUtils.ts`
```typescript
import type { TradeDirection } from "@/types/setup";

/**
 * Calculates Risk:Reward ratio.
 * Always returns a positive number (e.g., 2.5 for a 1:2.5 trade).
 */
export function calculateRiskReward(
  direction: TradeDirection,
  entryAvg: number,
  stopLoss: number,
  takeProfit: number
): number {
  if (entryAvg === stopLoss) return 0; // Prevent division by zero

  const risk = Math.abs(entryAvg - stopLoss);
  const reward = Math.abs(takeProfit - entryAvg);
  
  // Double-check logic: A LONG trade must have TP > Entry > SL.
  if (direction === "LONG" && (takeProfit <= entryAvg || stopLoss >= entryAvg)) return 0;
  if (direction === "SHORT" && (takeProfit >= entryAvg || stopLoss <= entryAvg)) return 0;

  return reward / risk;
}

/**
 * Validates if a setup passes the user's strict risk rules.
 */
export function validateSetupRisk(
  rr: number,
  minAllowedRR: number
): { isValid: boolean; reason?: string } {
  if (rr < minAllowedRR) {
    return {
      isValid: false,
      reason: `R:R of 1:${rr.toFixed(1)} is below your minimum rule of 1:${minAllowedRR}`,
    };
  }
  return { isValid: true };
}
```

#### Why this was written this way:
- **Directional Safety Guard:** Returns 0 if a target is inverted (e.g. TP below Entry on a Long trade).
- **Zero-Division Handling:** Guards against `entryAvg === stopLoss` to prevent `Infinity` or `NaN` calculations in database records.

---

### 2. Full Server Actions Module (`app/actions/setupActions.ts`)

**File:** `app/actions/setupActions.ts`
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SetupStatus } from "@/types/setup";
import { createSetupSchema, type CreateSetupFormData } from "@/lib/schemas/setup";
import { calculateRiskReward } from "@/lib/setupUtils";

export interface UpdateStatusResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action to update the lifecycle status of an existing trading setup.
 * Persists directly to Supabase and revalidates relevant dashboard pages.
 */
export async function updateSetupStatus(
  setupId: string,
  newStatus: SetupStatus
): Promise<UpdateStatusResult> {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 2. Update status (RLS guarantees update only succeeds if user owns the record)
    const { error } = await supabase
      .from("trading_setups")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", setupId);

    if (error) {
      console.error("Failed to update setup status:", error.message);
      return { success: false, error: error.message };
    }

    // 3. Revalidate affected routes so UI refreshes immediately
    revalidatePath("/setups");
    revalidatePath("/setups/history");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Server Action to create and persist a new trading setup in Supabase.
 */
export async function createTradingSetup(
  formData: CreateSetupFormData
): Promise<UpdateStatusResult> {
  try {
    const validated = createSetupSchema.parse(formData);
    const supabase = await createServerSupabaseClient();

    // 1. Enforce active authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const avgEntry = (validated.entryMin + validated.entryMax) / 2;
    const riskReward = calculateRiskReward(
      validated.direction,
      avgEntry,
      validated.stopLoss,
      validated.takeProfit1
    );

    const confluenceTags = validated.confluenceTags
      ? validated.confluenceTags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    // 2. Persist setup explicitly tagged with user.id
    const { error } = await supabase.from("trading_setups").insert({
      user_id: user.id,
      symbol: validated.symbol,
      direction: validated.direction,
      entry_min: validated.entryMin,
      entry_max: validated.entryMax,
      stop_loss: validated.stopLoss,
      take_profit_1: validated.takeProfit1,
      take_profit_2: null,
      risk_reward: riskReward,
      status: "WAITING_FOR_CONFIRMATION",
      invalidation_rule: validated.invalidationRule,
      notes: validated.notes ?? null,
      confluence_tags: confluenceTags,
    });

    if (error) {
      console.error("Supabase setup creation error:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/setups");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create setup";
    return { success: false, error: message };
  }
}
```

#### Why this was written this way:
- **Server-Side Validation:** Re-running `createSetupSchema.parse` on the server prevents bypassed client-side validation from inserting corrupt data.
- **Cache Invalidation:** `revalidatePath("/setups")` invalidates Next.js's data cache so users immediately see their new setup without waiting for background revalidation timers.
