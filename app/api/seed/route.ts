import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MOCK_ACTIVE_SETUPS, MOCK_HISTORY_SETUPS } from "@/lib/mock/setups";
import { MOCK_REPORTS } from "@/lib/mock/reports";
import { MOCK_EVENTS } from "@/lib/mock/events";
import { MOCK_NEWS } from "@/lib/mock/news";
import { MOCK_GOLD_DRIVERS, MOCK_KEY_LEVELS } from "@/lib/mock/gold";
import { MOCK_TECHNICALS } from "@/lib/mock/technical";
import type { Database, Json } from "@/types/database";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * GET: Performs database connectivity health check and audits table row counts.
 */
export async function GET() {
  const start = Date.now();
  try {
    const supabase = getAdminClient();

    const [setupsRes, reportsRes, eventsRes, newsRes, driversRes, levelsRes, techRes] = await Promise.all([
      supabase.from("trading_setups").select("*", { count: "exact", head: true }),
      supabase.from("session_reports").select("*", { count: "exact", head: true }),
      supabase.from("economic_events").select("*", { count: "exact", head: true }),
      supabase.from("market_news").select("*", { count: "exact", head: true }),
      supabase.from("gold_drivers").select("*", { count: "exact", head: true }),
      supabase.from("gold_key_levels").select("*", { count: "exact", head: true }),
      supabase.from("technical_analysis").select("*", { count: "exact", head: true }),
    ]);

    const latencyMs = Date.now() - start;

    return NextResponse.json({
      success: true,
      status: "CONNECTED",
      latencyMs,
      counts: {
        trading_setups: setupsRes.count ?? 0,
        session_reports: reportsRes.count ?? 0,
        economic_events: eventsRes.count ?? 0,
        market_news: newsRes.count ?? 0,
        gold_drivers: driversRes.count ?? 0,
        gold_key_levels: levelsRes.count ?? 0,
        technical_analysis: techRes.count ?? 0,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Health check failed";
    return NextResponse.json({
      success: false,
      status: "OFFLINE",
      latencyMs: Date.now() - start,
      error: message,
    });
  }
}

/**
 * POST: Idempotently seeds all 7 tables with institutional datasets.
 */
export async function POST() {
  try {
    const supabase = getAdminClient();

    // 1. Trading Setups
    const allSetups = [...MOCK_ACTIVE_SETUPS, ...MOCK_HISTORY_SETUPS];
    const setupsToInsert = allSetups.map((s) => ({
      symbol: s.symbol,
      direction: s.direction,
      entry_min: s.entryMin,
      entry_max: s.entryMax,
      stop_loss: s.stopLoss,
      take_profit_1: s.takeProfit1,
      take_profit_2: s.takeProfit2,
      risk_reward: s.riskReward,
      status: s.status,
      invalidation_rule: s.invalidationRule,
      notes: s.notes,
      confluence_tags: s.confluenceTags,
    }));
    await supabase.from("trading_setups").insert(setupsToInsert);

    // 2. Session Reports
    const reportsToInsert = MOCK_REPORTS.map((r) => ({
      title: r.title,
      session: r.session,
      timestamp: r.timestamp,
      bias: r.bias,
      volatility: r.volatility,
      executive_summary: r.executiveSummary,
      macro_catalysts: r.macroCatalysts,
      key_levels: r.keyLevels as unknown as Json,
      playbook: r.playbook as unknown as Json,
    }));
    await supabase.from("session_reports").insert(reportsToInsert);

    // 3. Economic Calendar Events
    const eventsToInsert = MOCK_EVENTS.map((e) => ({
      id: e.id,
      title: e.title,
      currency: e.currency,
      impact: e.impact,
      scheduled_at: e.scheduledAt,
      forecast: e.forecast,
      previous: e.previous,
      actual: e.actual,
      source: e.source,
      status: e.status,
    }));
    await supabase.from("economic_events").upsert(eventsToInsert, { onConflict: "id" });

    // 4. Market News
    const newsToInsert = MOCK_NEWS.map((n) => ({
      id: n.id,
      headline: n.headline,
      summary: n.summary,
      source: n.source,
      impact: n.impact,
      currencies: n.currencies,
      published_at: n.publishedAt,
    }));
    await supabase.from("market_news").upsert(newsToInsert, { onConflict: "id" });

    // 5. Gold Macro Drivers
    const driversToInsert = MOCK_GOLD_DRIVERS.map((d) => ({
      name: d.name,
      value: d.value,
      change: d.change,
      correlation: d.correlation,
      impact: d.impact,
    }));
    await supabase.from("gold_drivers").insert(driversToInsert);

    // 6. Gold Key Levels
    const levelsToInsert = MOCK_KEY_LEVELS.map((k) => ({
      price: k.price,
      type: k.type,
      strength: k.strength,
      notes: k.notes ?? null,
    }));
    await supabase.from("gold_key_levels").insert(levelsToInsert);

    // 7. Multi-Timeframe Technicals
    const technicalsToInsert = MOCK_TECHNICALS.map((t) => ({
      symbol: t.symbol,
      timeframes: t.timeframes as unknown as Json,
      overall_bias: t.overallBias,
    }));
    await supabase.from("technical_analysis").upsert(technicalsToInsert, { onConflict: "symbol" });

    return NextResponse.json({
      success: true,
      message: `Database synchronized! Seeded 7 tables: Setups (${setupsToInsert.length}), Reports (${reportsToInsert.length}), Events (${eventsToInsert.length}), News (${newsToInsert.length}), Drivers (${driversToInsert.length}), Levels (${levelsToInsert.length}), Technicals (${technicalsToInsert.length}).`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Seeding failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
