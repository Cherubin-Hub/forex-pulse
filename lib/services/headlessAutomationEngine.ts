import { createAdminClient } from "@/lib/supabase/admin";
import { getQuotes } from "@/lib/services/marketData";
import { getTechnicalAnalysis } from "@/lib/services/technical";
import { getEconomicEvents } from "@/lib/services/calendar";
import { scanMarketOpportunities } from "@/lib/services/strategyScanner";
import { evaluateSetupAutoResolution } from "@/lib/services/autoExecutionEngine";
import { mapRowToSetup } from "@/lib/supabase/mappers";
import type { TradingSetup } from "@/types/setup";
import type { PriceQuote } from "@/types/market";
import type { NotificationType, NotificationPriority } from "@/types/notification";
import type { TraderProfile } from "@/lib/schemas/settings";

export interface HeadlessCycleResult {
  success: boolean;
  timestamp: string;
  scannedSymbols: number;
  opportunitiesFound: number;
  setupsCreated: number;
  setupsUpdated: number;
  activeUsersCount: number;
  durationMs: number;
  error?: string;
}

/**
 * 24/7 Autonomous Headless Market Intelligence & Execution Engine.
 * Evaluates market opportunities tailored to each registered user's trader profile
 * (SCALPER, DAY_TRADER, SWING_TRADER) and auto-resolves open positions.
 */
export async function executeHeadlessAutomationCycle(): Promise<HeadlessCycleResult> {
  const startTime = Date.now();
  const supabase = createAdminClient();

  try {
    // 1. Fetch Registered Active Users with their profiles and risk constraints
    const { data: userSettings, error: userErr } = await supabase
      .from("user_settings")
      .select("user_id, trader_profile, min_risk_reward, max_open_setups");

    if (userErr) {
      throw new Error(`Failed to query user accounts: ${userErr.message}`);
    }

    const activeUsers = (userSettings || []).filter(
      (u): u is typeof u & { user_id: string } => Boolean(u.user_id)
    );

    // 2. Fetch Live Market Data in Parallel
    const [quotes, technicals, events] = await Promise.all([
      getQuotes(),
      getTechnicalAnalysis(),
      getEconomicEvents(),
    ]);

    const quoteMap = new Map<string, PriceQuote>(quotes.map((q) => [q.symbol, q]));

    // 3. JOB 1: Continuous Trade Resolution across ALL users (TP, SL, Entry)
    const { data: activeRows, error: setupsErr } = await supabase
      .from("trading_setups")
      .select("*")
      .in("status", ["WAITING_FOR_CONFIRMATION", "ENTRY_TRIGGERED"]);

    let setupsUpdated = 0;

    if (!setupsErr && activeRows && activeRows.length > 0) {
      for (const row of activeRows) {
        const quote = quoteMap.get(row.symbol);
        if (!quote || quote.price === null) continue;

        const setup: TradingSetup = mapRowToSetup(row);
        const resolution = evaluateSetupAutoResolution(setup, quote.price);

        if (resolution && resolution.nextStatus !== setup.status) {
          const { error: updateErr } = await supabase
            .from("trading_setups")
            .update({
              status: resolution.nextStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", setup.id);

          if (!updateErr) {
            setupsUpdated++;

            // Push Notification to the specific user's notification center
            if (row.user_id) {
              const notifType: NotificationType = "SETUP_STATUS";
              const notifPriority: NotificationPriority =
                resolution.nextStatus === "TP_REACHED" || resolution.nextStatus === "SL_HIT"
                  ? "HIGH"
                  : "INFO";

              const title =
                resolution.nextStatus === "TP_REACHED"
                  ? `🎯 Take Profit Hit: ${setup.symbol}`
                  : resolution.nextStatus === "SL_HIT"
                  ? `🛑 Stop Loss Hit: ${setup.symbol}`
                  : resolution.nextStatus === "ENTRY_TRIGGERED"
                  ? `⚡ Setup Triggered: ${setup.symbol} Active`
                  : `⚠️ Setup Invalidated: ${setup.symbol}`;

              await supabase.from("notifications").insert({
                user_id: row.user_id,
                type: notifType,
                priority: notifPriority,
                title,
                message: resolution.reason,
                symbol: setup.symbol,
                link_href: "/setups",
                action_label: "View Trade",
                read: false,
              });
            }
          }
        }
      }
    }

    // 4. JOB 2: Market Strategy Scanner Tailored by User Profile (SCALPER, DAY_TRADER, SWING_TRADER)
    let opportunitiesFound = 0;
    let setupsCreated = 0;

    // Cache scan results by profile to prevent re-scanning identical profiles
    const profileScanCache = new Map<string, Awaited<ReturnType<typeof scanMarketOpportunities>>>();

    for (const user of activeUsers) {
      const profile: TraderProfile = (user.trader_profile as TraderProfile) || "DAY_TRADER";
      const maxOpen = Number(user.max_open_setups) || 3;

      // Check current open setups count for this user
      const { data: openSetups } = await supabase
        .from("trading_setups")
        .select("id, symbol")
        .eq("user_id", user.user_id)
        .in("status", ["WAITING_FOR_CONFIRMATION", "ENTRY_TRIGGERED"]);

      const currentOpenCount = openSetups?.length || 0;
      if (currentOpenCount >= maxOpen) {
        continue; // User reached maximum allowed concurrent setups
      }

      const activeSymbolsForUser = new Set((openSetups || []).map((s) => s.symbol));

      // Retrieve or compute scan for this profile
      const cacheKey = `${profile}_${user.min_risk_reward || "default"}`;
      let scanResult = profileScanCache.get(cacheKey);

      if (!scanResult) {
        scanResult = await scanMarketOpportunities({
          traderProfile: profile,
          minRiskReward: user.min_risk_reward ? Number(user.min_risk_reward) : undefined,
          enableNewsFilter: true,
        });
        profileScanCache.set(cacheKey, scanResult);
      }

      opportunitiesFound = Math.max(opportunitiesFound, scanResult.opportunities.length);

      // Commit qualifying setups up to user's max_open_setups limit
      let remainingSlots = maxOpen - currentOpenCount;

      for (const opp of scanResult.opportunities) {
        if (remainingSlots <= 0) break;
        if (activeSymbolsForUser.has(opp.symbol)) continue; // Already waiting or running

        const { error: insertErr } = await supabase.from("trading_setups").insert({
          user_id: user.user_id,
          symbol: opp.symbol,
          direction: opp.direction,
          entry_min: opp.entryMin,
          entry_max: opp.entryMax,
          stop_loss: opp.stopLoss,
          take_profit_1: opp.takeProfit1,
          take_profit_2: null,
          risk_reward: opp.riskReward,
          status: "WAITING_FOR_CONFIRMATION",
          invalidation_rule: opp.invalidationRule,
          notes: opp.notes,
          confluence_tags: opp.confluenceTags,
        });

        if (!insertErr) {
          setupsCreated++;
          remainingSlots--;
          activeSymbolsForUser.add(opp.symbol);

          const notifType: NotificationType = "PRICE_SIGNAL";
          const notifPriority: NotificationPriority = "HIGH";

          await supabase.from("notifications").insert({
            user_id: user.user_id,
            type: notifType,
            priority: notifPriority,
            title: `⚡ ${profile} Scanner: Discovered ${opp.symbol} ${opp.direction}`,
            message: `High-confluence (${opp.confluenceScore}%) ${opp.strategy} signal auto-committed. R:R ${opp.riskReward}.`,
            symbol: opp.symbol,
            link_href: "/setups",
            action_label: "Review Setup",
            read: false,
          });
        }
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      success: true,
      timestamp: new Date().toISOString(),
      scannedSymbols: quotes.length,
      opportunitiesFound,
      setupsCreated,
      setupsUpdated,
      activeUsersCount: activeUsers.length,
      durationMs,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Headless cycle failed";
    return {
      success: false,
      timestamp: new Date().toISOString(),
      scannedSymbols: 0,
      opportunitiesFound: 0,
      setupsCreated: 0,
      setupsUpdated: 0,
      activeUsersCount: 0,
      durationMs: Date.now() - startTime,
      error: message,
    };
  }
}
