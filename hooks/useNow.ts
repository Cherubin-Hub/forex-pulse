"use client";

import { useEffect, useState } from "react";

/**
 * Returns the current time, updated every `intervalMs`.
 * Returns null on the first render to avoid server/client hydration mismatches.
 */
export function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const intervalId = setInterval(tick, intervalMs);
    return () => clearInterval(intervalId);
  }, [intervalMs]);

  return now;
}
