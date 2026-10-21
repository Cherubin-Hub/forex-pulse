import { NextRequest, NextResponse } from "next/server";
import { hasSecretAuthorization } from "@/lib/cronAuth";
import { macroIngestionSchema } from "@/lib/schemas/ingestion";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
export async function POST(request: NextRequest) {
  if (!hasSecretAuthorization(request.headers, process.env.MACRO_INGEST_SECRET))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const text = await request.text();
    if (text.length > 2_000_000)
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = macroIngestionSchema.safeParse(input);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid feed payload", details: parsed.error.issues },
        { status: 400 },
      );
    const { error } = await createAdminClient().rpc("ingest_macro_data", {
      payload: parsed.data as unknown as Json,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({
      success: true,
      feed: parsed.data.feed,
      records: parsed.data.records.length,
    });
  } catch (error: unknown) {
    console.error("Feed import failed:", error);
    return NextResponse.json(
      { error: "Feed import failed. No feed health update was committed." },
      { status: 503 },
    );
  }
}
