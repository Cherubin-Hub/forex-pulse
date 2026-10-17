import { NextRequest, NextResponse } from "next/server";
import { executeHeadlessAutomationCycle } from "@/lib/services/headlessAutomationEngine";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Up to 60s timeout for cron

/**
 * 24/7 Headless Server Cron Endpoint.
 * Can be invoked by Vercel Cron, external webhook schedulers, or manual diagnostic tests.
 */
async function handleScan(req: NextRequest) {
  // Optional security barrier if CRON_SECRET is configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const searchParam = req.nextUrl.searchParams.get("secret");
    const isAuthorized =
      authHeader === `Bearer ${cronSecret}` || searchParam === cronSecret;

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized cron invocation." },
        { status: 401 }
      );
    }
  }

  const result = await executeHeadlessAutomationCycle();
  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}

export async function GET(req: NextRequest) {
  return handleScan(req);
}

export async function POST(req: NextRequest) {
  return handleScan(req);
}
