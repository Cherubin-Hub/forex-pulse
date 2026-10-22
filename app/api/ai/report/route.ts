import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/user";
import { generateSessionReport } from "@/app/actions/reportActions";
import type { SessionType } from "@/types/report";

export async function POST(req: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const session: SessionType = body.session || "LONDON_OPEN";

    const result = await generateSessionReport(session);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to generate report" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      report: result.data,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const hasGemini = Boolean(
    process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_AI_API_KEY,
  );

  return NextResponse.json({
    status: "ok",
    aiProvider: hasGemini ? "Google Gemini Flash (Active)" : "Deterministic Statistical Engine (Fallback)",
    features: [
      "Macro Catalysts Synthesis",
      "Dynamic Liquidity Level Pivot Extraction",
      "Pre-Session Risk Directives",
      "Automated Fallback Resilience",
    ],
  });
}
