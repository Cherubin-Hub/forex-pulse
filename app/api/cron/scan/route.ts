import { NextRequest, NextResponse } from "next/server";
import { executeHeadlessAutomationCycle } from "@/lib/services/headlessAutomationEngine";
import { verifySessionToken } from "@/lib/sso/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Up to 60s timeout for cron

/**
 * 24/7 Headless Server Cron Endpoint.
 * Can be invoked by external webhook schedulers (e.g. cron-job.org), Vercel Cron, or authenticated traders.
 */
async function handleScan(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const searchParam = req.nextUrl.searchParams.get("secret");

    const tokenMatches =
      authHeader === `Bearer ${cronSecret}` || searchParam === cronSecret;

    // Check if called from an authenticated browser session
    const gatewayCookie = req.cookies.get("fp_gateway_session")?.value;
    const sessionResult = gatewayCookie ? await verifySessionToken(gatewayCookie) : { valid: false };

    if (!tokenMatches && !sessionResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized cron invocation. Provide 'Authorization: Bearer <CRON_SECRET>' header or append '?secret=<CRON_SECRET>' to the request URL.",
        },
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
