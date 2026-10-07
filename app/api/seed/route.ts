import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MOCK_ACTIVE_SETUPS, MOCK_HISTORY_SETUPS } from "@/lib/mock/setups";
import { MOCK_REPORTS } from "@/lib/mock/reports";
import type { Database, Json } from "@/types/database";

type SetupInsert = Database["public"]["Tables"]["trading_setups"]["Insert"];
type ReportInsert = Database["public"]["Tables"]["session_reports"]["Insert"];

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Admin client that bypasses RLS for system/seed data
    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Seed Trading Setups
    const allSetups = [...MOCK_ACTIVE_SETUPS, ...MOCK_HISTORY_SETUPS];
    const setupsToInsert: SetupInsert[] = allSetups.map((s) => ({
      user_id: null,
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

    const { error: setupsError } = await supabase
      .from("trading_setups")
      .insert(setupsToInsert);

    if (setupsError) {
      return NextResponse.json(
        { success: false, error: setupsError.message },
        { status: 500 }
      );
    }

    // 2. Seed Session Reports
    const reportsToInsert: ReportInsert[] = MOCK_REPORTS.map((r) => ({
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

    const { error: reportsError } = await supabase
      .from("session_reports")
      .insert(reportsToInsert);

    if (reportsError) {
      return NextResponse.json(
        { success: false, error: reportsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${setupsToInsert.length} setups and ${reportsToInsert.length} reports into Supabase!`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Seeding failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
