"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
/** Refresh through authenticated server controllers; Gateway cookies are not Supabase JWTs. */
export function SetupRealtimeListener() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
