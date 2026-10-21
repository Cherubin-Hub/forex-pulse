import "server-only";
import { z } from "zod";
import { macroIngestionSchema } from "@/lib/schemas/ingestion";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
/** Pull normalized observations from the configured trusted data adapter. */
export async function refreshMacroFeeds(): Promise<void> {
  const raw = process.env.MACRO_FEED_URL;
  if (!raw) return;
  const url = new URL(raw);
  if (url.protocol !== "https:")
    throw new Error("MACRO_FEED_URL must use HTTPS.");
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: process.env.MACRO_FEED_TOKEN
      ? { authorization: `Bearer ${process.env.MACRO_FEED_TOKEN}` }
      : {},
  });
  if (!response.ok) throw new Error("Macro provider could not be reached.");
  const text = await response.text();
  if (text.length > 2000000)
    throw new Error("Macro provider response exceeds limit.");
  const payloads = z.array(macroIngestionSchema).max(4).parse(JSON.parse(text));
  for (const payload of payloads) {
    const { error } = await createAdminClient().rpc("ingest_macro_data", {
      payload: payload as unknown as Json,
    });
    if (error) throw new Error(error.message);
  }
}
