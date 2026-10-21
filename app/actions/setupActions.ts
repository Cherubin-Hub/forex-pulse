"use server";
import { revalidatePath } from "next/cache";
import { requireUserId, getAuthenticatedUser } from "@/lib/auth/user";
import { ensureGatewayIdentity } from "@/lib/services/gatewayIdentity";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createSetupForUser,
  getOwnedSetup,
  setupPayload,
  assertEntryAllowed,
  resolveSetupForUser,
} from "@/lib/services/trading";
import { mapRowToSetup } from "@/lib/supabase/mappers";
import { getQuote } from "@/lib/services/marketData";
import { isVerifiedQuote } from "@/lib/marketQuality";
import type { CreateSetupFormData } from "@/lib/schemas/setup";
import type { SetupStatus } from "@/types/setup";
export type { UpdateStatusResult } from "@/types/action";
import type { UpdateStatusResult } from "@/types/action";
function refresh() {
  revalidatePath("/", "layout");
}
function failure(error: unknown): UpdateStatusResult {
  return {
    success: false,
    error: error instanceof Error ? error.message : "Setup operation failed",
  };
}
export async function createTradingSetup(
  input: CreateSetupFormData,
): Promise<UpdateStatusResult> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    await ensureGatewayIdentity(user);
    await createSetupForUser(user.userId, input);
    refresh();
    return { success: true };
  } catch (error: unknown) {
    return failure(error);
  }
}
export async function updateSetupStatus(
  setupId: string,
  status: SetupStatus,
): Promise<UpdateStatusResult> {
  try {
    const changed = await resolveSetupForUser(
      await requireUserId(),
      setupId,
      status,
    );
    if (!changed)
      throw new Error(
        "No verified market transition is available. Refresh the setup.",
      );
    refresh();
    return { success: true };
  } catch (error: unknown) {
    return failure(error);
  }
}
export async function updateTradingSetup(
  setupId: string,
  input: CreateSetupFormData,
): Promise<UpdateStatusResult> {
  try {
    const userId = await requireUserId(),
      row = await getOwnedSetup(userId, setupId);
    if (row.status !== "WAITING_FOR_CONFIRMATION")
      throw new Error("Only pending setups can be edited.");
    const payload = setupPayload(input);
    await assertEntryAllowed(
      userId,
      mapRowToSetup({
        ...row,
        ...payload,
        confluence_tags: payload.confluence_tags ?? [],
        notes: payload.notes ?? null,
        take_profit_2: null,
      }),
    );
    const { data, error } = await createAdminClient()
      .from("trading_setups")
      .update(payload)
      .eq("id", setupId)
      .eq("user_id", userId)
      .eq("status", "WAITING_FOR_CONFIRMATION")
      .select("id")
      .maybeSingle();
    if (error || !data)
      throw new Error(error?.message ?? "Setup changed. Please refresh.");
    refresh();
    return { success: true };
  } catch (error: unknown) {
    return failure(error);
  }
}
export async function setSetupToBreakeven(
  setupId: string,
): Promise<UpdateStatusResult> {
  try {
    const userId = await requireUserId(),
      row = await getOwnedSetup(userId, setupId);
    if (row.status !== "ENTRY_TRIGGERED")
      throw new Error("Only active trades can move to breakeven.");
    const quote = await getQuote(row.symbol),
      entry = (Number(row.entry_min) + Number(row.entry_max)) / 2;
    const distance = Math.abs(
      entry - Number(row.original_stop_loss ?? row.stop_loss),
    );
    if (
      !isVerifiedQuote(quote) ||
      distance <= 0 ||
      (row.direction === "LONG" ? quote.price - entry : entry - quote.price) <
        distance
    )
      throw new Error("A verified move of at least +1R is required.");
    const { data, error } = await createAdminClient()
      .from("trading_setups")
      .update({ stop_loss: entry })
      .eq("id", setupId)
      .eq("user_id", userId)
      .eq("status", "ENTRY_TRIGGERED")
      .select("id")
      .maybeSingle();
    if (error || !data)
      throw new Error(error?.message ?? "Setup changed. Please refresh.");
    refresh();
    return { success: true };
  } catch (error: unknown) {
    return failure(error);
  }
}
export async function deleteTradingSetup(
  setupId: string,
): Promise<UpdateStatusResult> {
  try {
    const userId = await requireUserId();
    const row = await getOwnedSetup(userId, setupId);
    if (row.status !== "WAITING_FOR_CONFIRMATION")
      throw new Error(
        "Active and closed trades are retained to protect journal integrity.",
      );
    const { data, error } = await createAdminClient()
      .from("trading_setups")
      .delete()
      .eq("id", setupId)
      .eq("user_id", userId)
      .eq("status", "WAITING_FOR_CONFIRMATION")
      .select("id")
      .maybeSingle();
    if (error || !data)
      throw new Error(error?.message ?? "Setup changed. Please refresh.");
    refresh();
    return { success: true };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function checkSetupMarketStatus(
  setupId: string,
): Promise<UpdateStatusResult> {
  try {
    const changed = await resolveSetupForUser(await requireUserId(), setupId);
    if (!changed)
      return {
        success: false,
        error:
          "No status change is confirmed by the current verified market price.",
      };
    refresh();
    return { success: true };
  } catch (error: unknown) {
    return failure(error);
  }
}
