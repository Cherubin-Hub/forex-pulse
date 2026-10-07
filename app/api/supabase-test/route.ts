import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Test ping / query against trading_setups
    const { data: setups, error: setupsError } = await supabase
      .from("trading_setups")
      .select("count", { count: "exact", head: true });

    if (setupsError) {
      return NextResponse.json(
        {
          success: false,
          stage: "Database Query Error",
          message: setupsError.message,
          hint: setupsError.hint || "Check if your schema was run in the Supabase SQL Editor.",
        },
        { status: 500 }
      );
    }

    // 2. Test query against session_reports
    const { error: reportsError } = await supabase
      .from("session_reports")
      .select("count", { count: "exact", head: true });

    if (reportsError) {
      return NextResponse.json(
        {
          success: false,
          stage: "Reports Table Error",
          message: reportsError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Supabase connection is active and tables are accessible!",
      configuredUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      tablesChecked: ["trading_setups", "session_reports"],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        stage: "Environment / Client Initialization Error",
        message,
      },
      { status: 500 }
    );
  }
}
