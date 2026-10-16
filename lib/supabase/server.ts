import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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
 * Creates a Supabase client for use in Next.js Server Components, Server Actions, or Route Handlers.
 * Automatically synchronizes auth session tokens with Next.js request cookies.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = cleanUrl(rawUrl);
  const supabaseAnonKey = rawKey ? rawKey.trim().replace(/^['"`]+|['"`]+$/g, "") : "";

  if (!supabaseUrl || !supabaseAnonKey || (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://"))) {
    throw new Error(
      "Missing or invalid Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set."
    );
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}
