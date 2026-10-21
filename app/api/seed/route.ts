import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/user";
import { createAdminClient } from "@/lib/supabase/admin";
export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  try {
    const { error } = await createAdminClient()
      .from("user_settings")
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    if (error)
      return NextResponse.json(
        {
          success: false,
          status: "OFFLINE",
          error: "Database unavailable or migration required.",
        },
        { status: 503 },
      );
    return NextResponse.json({ success: true, status: "CONNECTED" });
  } catch {
    return NextResponse.json(
      {
        success: false,
        status: "OFFLINE",
        error: "Database unavailable or migration required.",
      },
      { status: 503 },
    );
  }
}
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Demo seeding is disabled. Use the verified macro feed importer.",
    },
    { status: 410 },
  );
}
