import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getQuotes } from "@/lib/services/marketData";
import { getEconomicEvents } from "@/lib/services/calendar";
import { getActiveSetups } from "@/lib/services/setups";
import { synthesizeSessionReportData } from "@/lib/reports/reportGenerator";
import type { SessionType } from "@/types/report";
import type { Database, Json } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    // 1. Verify Vercel Cron Secret (if configured)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized cron invocation" }, { status: 401 });
    }

    // 2. Parse session parameter from URL (default to LONDON_OPEN)
    const { searchParams } = new URL(request.url);
    const sessionParam = (searchParams.get("session") ?? "LONDON_OPEN") as SessionType;

    // 3. Gather live cross-module data
    const [quotes, events, setups] = await Promise.all([
      getQuotes(),
      getEconomicEvents(),
      getActiveSetups(),
    ]);

    // 4. Synthesize report
    const reportData = synthesizeSessionReportData(sessionParam, quotes, events, setups);

    // 5. Connect to Supabase using admin credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        success: true,
        message: "Report synthesized in local mode (Supabase not configured)",
        report: reportData,
      });
    }

    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

    const { data: inserted, error: insertError } = await supabase
      .from("session_reports")
      .insert({
        title: reportData.title,
        session: reportData.session,
        bias: reportData.bias,
        volatility: reportData.volatility,
        executive_summary: reportData.executiveSummary,
        macro_catalysts: reportData.macroCatalysts,
        key_levels: reportData.keyLevels as unknown as Json,
        playbook: reportData.playbook as unknown as Json,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synthesized and archived ${sessionParam} report!`,
      reportId: inserted.id,
      title: inserted.title,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron execution failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
