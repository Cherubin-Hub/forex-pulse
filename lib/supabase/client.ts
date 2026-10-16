import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

function cleanUrl(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  let url = raw.trim().replace(/^['"`]+|['"`]+$/g, "");
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

/**
 * Creates a Supabase client for use inside Client Components ("use client").
 */
export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = cleanUrl(rawUrl);
  const supabaseAnonKey = rawKey ? rawKey.trim().replace(/^['"`]+|['"`]+$/g, "") : "";

  if (!supabaseUrl || !supabaseAnonKey || (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://"))) {
    throw new Error(
      "Missing or invalid Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be valid."
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

