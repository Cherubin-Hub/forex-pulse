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
 */
export async function updateSetupStatus(
  setupId: string,
  newStatus: SetupStatus
): Promise<UpdateStatusResult> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

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

/**
 * Server Action to modify and update parameters of an existing trading setup.
 */
export async function updateTradingSetup(
  setupId: string,
  formData: CreateSetupFormData
): Promise<UpdateStatusResult> {
  try {
    const validated = createSetupSchema.parse(formData);
    const supabase = await createServerSupabaseClient();

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

    const { error } = await supabase
      .from("trading_setups")
      .update({
        symbol: validated.symbol,
        direction: validated.direction,
        entry_min: validated.entryMin,
        entry_max: validated.entryMax,
        stop_loss: validated.stopLoss,
        take_profit_1: validated.takeProfit1,
        risk_reward: riskReward,
        invalidation_rule: validated.invalidationRule,
        notes: validated.notes ?? null,
        confluence_tags: confluenceTags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", setupId);

    if (error) {
      console.error("Supabase setup update error:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/setups");
    revalidatePath("/setups/history");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update setup";
    return { success: false, error: message };
  }
}

/**
 * Server Action to immediately trail an active trade's stop loss to Breakeven (entry midpoint).
 */
export async function setSetupToBreakeven(
  setupId: string
): Promise<UpdateStatusResult> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 1. Fetch current setup to determine entry midpoint
    const { data: setup, error: fetchError } = await supabase
      .from("trading_setups")
      .select("entry_min, entry_max, notes")
      .eq("id", setupId)
      .single();

    if (fetchError || !setup) {
      return { success: false, error: "Setup not found." };
    }

    const avgEntry = (Number(setup.entry_min) + Number(setup.entry_max)) / 2;
    const updatedNotes = setup.notes 
      ? `${setup.notes} [SL moved to Breakeven @ ${avgEntry}]`
      : `[SL moved to Breakeven @ ${avgEntry}]`;

    // 2. Persist Breakeven Stop Loss
    const { error: updateError } = await supabase
      .from("trading_setups")
      .update({
        stop_loss: avgEntry,
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", setupId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/setups");
    revalidatePath("/setups/history");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to set Breakeven";
    return { success: false, error: message };
  }
}

/**
 * Server Action to delete a trading setup.
 */
export async function deleteTradingSetup(
  setupId: string
): Promise<UpdateStatusResult> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("trading_setups")
      .delete()
      .eq("id", setupId);

    if (error) {
      console.error("Failed to delete setup:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/setups");
    revalidatePath("/setups/history");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete setup";
    return { success: false, error: message };
  }
}
