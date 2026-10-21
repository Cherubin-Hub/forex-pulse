import { NextRequest, NextResponse } from "next/server";
import { hasSecretAuthorization } from "@/lib/cronAuth";
import { refreshMacroFeeds } from "@/lib/services/refreshFeeds";
import { executeHeadlessAutomationCycle } from "@/lib/services/headlessAutomationEngine";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
async function handle(request: NextRequest) {
  if (!hasSecretAuthorization(request.headers, process.env.CRON_SECRET))
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  try {
    await refreshMacroFeeds();
  } catch (error: unknown) {
    console.error(
      "Macro refresh failed:",
      error instanceof Error ? error.message : "Unavailable",
    );
  }
  const result = await executeHeadlessAutomationCycle();
  return NextResponse.json(result, { status: result.success ? 200 : 503 });
}
export async function GET(request: NextRequest) {
  return handle(request);
}
export async function POST(request: NextRequest) {
  return handle(request);
}
