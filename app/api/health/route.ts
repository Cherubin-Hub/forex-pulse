import { NextResponse } from "next/server";
import { isForexMarketOpen } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const now = new Date();
  return NextResponse.json({
    status: "healthy",
    app: "forex-pulse",
    marketOpen: isForexMarketOpen(now),
    uptime: process.uptime(),
    timestamp: now.toISOString(),
    latencyMs: Date.now() - started,
  });
}
