import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserSettings } from "@/lib/services/userSettings";
import { getCalendarSnapshot } from "@/lib/services/calendar";
import { getQuote } from "@/lib/services/marketData";
import { isDemoMode, isVerifiedQuote } from "@/lib/marketQuality";
import { evaluateSetupAutoResolution } from "@/lib/services/autoExecutionEngine";
import { evaluateCircuitBreaker } from "@/lib/circuitBreakerUtils";
import { evaluatePreTradeAudit } from "@/lib/gatekeeperUtils";
import { mapRowToSetup } from "@/lib/supabase/mappers";
import {
  createSetupSchema,
  type CreateSetupFormData,
} from "@/lib/schemas/setup";
import { calculateRiskReward } from "@/lib/setupUtils";
import { isForexMarketOpen, getSessionStatus } from "@/lib/sessions";
import { MARKET_SESSIONS } from "@/lib/constants/sessions";
import type { TradingSetup, SetupStatus } from "@/types/setup";
import type { Database } from "@/types/database";

export async function getOwnedSetup(userId: string, setupId: string) {
  const { data, error } = await createAdminClient()
    .from("trading_setups")
    .select("*")
    .eq("id", setupId)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("Setup not found or access denied.");
  return data;
}
export async function assertEntryAllowed(
  userId: string,
  candidate: TradingSetup,
): Promise<void> {
  if (isDemoMode())
    throw new Error("Demo mode cannot create or activate saved trades.");
  const now = new Date();
  const [settings, quote, calendar, result] = await Promise.all([
    getUserSettings(userId),
    getQuote(candidate.symbol),
    getCalendarSnapshot(),
    createAdminClient()
      .from("trading_setups")
      .select("*")
      .eq("user_id", userId),
  ]);
  if (result.error) throw new Error("Unable to verify portfolio risk.");
  if (!isForexMarketOpen(now)) throw new Error("Forex market is closed.");
  if (!isVerifiedQuote(quote))
    throw new Error("A fresh verified market quote is required.");
  if (!calendar.available)
    throw new Error(
      "Verified calendar coverage is unavailable. Trading is paused.",
    );
  if (
    !MARKET_SESSIONS.some(
      (session) =>
        settings.sessionFocus.includes(session.id) &&
        getSessionStatus(session, now).isOpen,
    )
  )
    throw new Error("Outside your selected trading sessions.");
  const setups = (result.data ?? []).map(mapRowToSetup);
  if (evaluateCircuitBreaker(setups, settings, now).isTradingLocked)
    throw new Error("Daily risk limit or self-exclusion is active.");
  if (candidate.riskReward < settings.minRiskReward)
    throw new Error("Setup does not meet your minimum risk reward.");
  if (
    setups.some(
      (setup) =>
        setup.id !== candidate.id &&
        setup.symbol === candidate.symbol &&
        ["WAITING_FOR_CONFIRMATION", "ENTRY_TRIGGERED"].includes(setup.status),
    )
  )
    throw new Error("An open setup already exists for this symbol.");
  const audit = evaluatePreTradeAudit(
    candidate,
    calendar.events,
    setups,
    settings,
    now,
  );
  if (audit.overallVerdict === "BLOCKED")
    throw new Error(
      audit.newsCheck.verdict === "BLOCKED"
        ? audit.newsCheck.message
        : audit.riskCheck.message,
    );
}
export function setupPayload(
  input: CreateSetupFormData,
): Database["public"]["Tables"]["trading_setups"]["Insert"] {
  const value = createSetupSchema.parse(input);
  return {
    symbol: value.symbol,
    direction: value.direction,
    entry_min: value.entryMin,
    entry_max: value.entryMax,
    stop_loss: value.stopLoss,
    take_profit_1: value.takeProfit1,
    take_profit_2: null,
    risk_reward: calculateRiskReward(
      value.direction,
      (value.entryMin + value.entryMax) / 2,
      value.stopLoss,
      value.takeProfit1,
    ),
    status: "WAITING_FOR_CONFIRMATION",
    invalidation_rule: value.invalidationRule,
    notes: value.notes ?? null,
    confluence_tags:
      value.confluenceTags
        ?.split(",")
        .map((tag) => tag.trim())
        .filter(Boolean) ?? [],
  };
}
export async function createSetupForUser(
  userId: string,
  input: CreateSetupFormData,
): Promise<void> {
  const payload = setupPayload(input);
  const candidate = mapRowToSetup({
    ...payload,
    id: "new",
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    take_profit_2: null,
    notes: payload.notes ?? null,
    confluence_tags: payload.confluence_tags ?? [],
    original_stop_loss: payload.stop_loss,
    realized_r: null,
    closed_at: null,
    risk_percent: 1,
  });
  await assertEntryAllowed(userId, candidate);
  const { error } = await createAdminClient()
    .from("trading_setups")
    .insert({ ...payload, user_id: userId });
  if (error) throw new Error(error.message);
  const notification = await createAdminClient()
    .from("notifications")
    .insert({
      user_id: userId,
      type: "SETUP_STATUS",
      priority: "INFO",
      title: `Setup saved: ${payload.symbol}`,
      message: "Pending setup passed the account risk checks.",
      symbol: payload.symbol,
      link_href: "/setups",
      read: false,
    });
  if (notification.error)
    console.warn("Setup notification unavailable:", notification.error.message);
}
export async function resolveSetupForUser(
  userId: string,
  setupId: string,
  requestedStatus?: SetupStatus,
): Promise<boolean> {
  if (isDemoMode()) return false;
  const row = await getOwnedSetup(userId, setupId);
  if (!["WAITING_FOR_CONFIRMATION", "ENTRY_TRIGGERED"].includes(row.status))
    return false;
  const quote = await getQuote(row.symbol);
  if (!isVerifiedQuote(quote) || !isForexMarketOpen(new Date())) return false;
  const setup = mapRowToSetup(row);
  const resolution = evaluateSetupAutoResolution(setup, quote.price);
  if (
    !resolution ||
    (requestedStatus && resolution.nextStatus !== requestedStatus)
  )
    return false;
  if (resolution.nextStatus === "ENTRY_TRIGGERED")
    await assertEntryAllowed(userId, setup);
  const { data, error } = await createAdminClient()
    .from("trading_setups")
    .update({
      status: resolution.nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", setupId)
    .eq("user_id", userId)
    .eq("status", setup.status)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) {
    const notification = await createAdminClient()
      .from("notifications")
      .insert({
        user_id: userId,
        type: "SETUP_STATUS",
        priority: "HIGH",
        title: `${setup.symbol}: ${resolution.nextStatus.replaceAll("_", " ")}`,
        message: resolution.reason,
        symbol: setup.symbol,
        link_href: "/setups/history",
        read: false,
      });
    if (notification.error)
      console.warn(
        "Trade notification unavailable:",
        notification.error.message,
      );
  }
  return Boolean(data);
}
