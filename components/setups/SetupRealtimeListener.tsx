"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Headless Realtime Listener for Trading Setups.
 * Listens to Supabase Postgres CDC (Change Data Capture) via WebSockets.
 * Re-validates the Server Component page data automatically whenever trades change.
 */
export function SetupRealtimeListener() {
  const router = useRouter();

  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch (err) {
      console.debug("[Realtime] Supabase unavailable for setup listener:", err);
      return;
    }

    if (!supabase) return;

    const channel = supabase
      .channel("trading_setups_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_setups",
        },
        () => {
          // Re-triggers the Next.js App Router server component fetch
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [router]);

  return null;
}
