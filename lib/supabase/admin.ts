import "server-only";

import { createClient } from "@supabase/supabase-js";
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
 * Creates a privileged Supabase client for Server Actions and backend engines.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row-Level Security, allowing
 * automated background engines and authenticated Gateway users to modify setups.
 */
export function createAdminClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = cleanUrl(rawUrl);
  const serviceRoleKey = rawKey
    ? rawKey.trim().replace(/^['"`]+|['"`]+$/g, "")
    : "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
