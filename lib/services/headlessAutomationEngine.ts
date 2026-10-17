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
 * Runs completely independent of user browser sessions on the server.
 */
export async function executeHeadlessAutomationCycle(): Promise<HeadlessCycleResult> {
  const startTime = Date.now();
  const supabase = createAdminClient();

  try {
    // 1. Fetch Registered Active Users
    const { data: userSettings, error: userErr } = await supabase
      .from("user_settings")
      .select("user_id");

    if (userErr) {
      throw new Error(`Failed to query user accounts: ${userErr.message}`);
    }

    const activeUserIds: string[] = (userSettings || [])
      .map((u) => u.user_id)
      .filter((id): id is string => Boolean(id));

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

    // 4. JOB 2: Market Strategy Scanner & Autonomous Signal Commitment
    let opportunitiesFound = 0;
    let setupsCreated = 0;

    if (activeUserIds.length > 0) {
      const scanResult = await scanMarketOpportunities({
        minConfluenceScore: 75,
        minRiskReward: 2.0,
        enableNewsFilter: true,
      });

      opportunitiesFound = scanResult.opportunities.length;

      if (opportunitiesFound > 0) {
        for (const opp of scanResult.opportunities) {
          for (const userId of activeUserIds) {
            // Deduplication guard: Check if user already has an active setup for this pair
            const { data: existing } = await supabase
              .from("trading_setups")
              .select("id")
              .eq("user_id", userId)
              .eq("symbol", opp.symbol)
              .in("status", ["WAITING_FOR_CONFIRMATION", "ENTRY_TRIGGERED"])
              .limit(1);

            if (!existing || existing.length === 0) {
              const { error: insertErr } = await supabase
                .from("trading_setups")
                .insert({
                  user_id: userId,
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

                const notifType: NotificationType = "PRICE_SIGNAL";
                const notifPriority: NotificationPriority = "HIGH";

                await supabase.from("notifications").insert({
                  user_id: userId,
                  type: notifType,
                  priority: notifPriority,
                  title: `⚡ 24/7 Scanner: Discovered ${opp.symbol} ${opp.direction}`,
                  message: `High-confluence (${opp.confluenceScore}%) signal auto-committed while offline. R:R ${opp.riskReward}.`,
                  symbol: opp.symbol,
                  link_href: "/setups",
                  action_label: "Review Setup",
                  read: false,
                });
              }
            }
          }
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
      activeUsersCount: activeUserIds.length,
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
