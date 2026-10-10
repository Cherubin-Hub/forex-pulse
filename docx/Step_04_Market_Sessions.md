# Step 4: Market Session Bar & DST-Aware Clock

## 🎯 Overview
In this step, we implement the live trading session status bar. It tracks the 3 major global forex sessions (Asian, London, New York), calculates active overlaps (e.g., London & New York liquidity overlap), determines if the weekend forex market is open or closed, and converts session opening/closing hours to Philippine Standard Time (PHT, UTC+8) with strict hydration safety.

---

### 1. Market Session Constants (`lib/constants/sessions.ts`)

Defines session time zones, opening hours, and weekend market boundary logic.

**File:** `lib/constants/sessions.ts`
```typescript
import type { SessionDefinition } from "@/types/session";

export const MARKET_SESSIONS: SessionDefinition[] = [
  { id: "ASIAN", name: "Asian", city: "Tokyo", timeZone: "Asia/Tokyo", openHour: 9, closeHour: 18 },
  { id: "LONDON", name: "London", city: "London", timeZone: "Europe/London", openHour: 8, closeHour: 17 },
  { id: "NEW_YORK", name: "New York", city: "New York", timeZone: "America/New_York", openHour: 8, closeHour: 17 },
];

// Forex trades from Sunday 17:00 to Friday 17:00 New York time.
export const FOREX_WEEK_TIME_ZONE = "America/New_York";
export const FOREX_WEEK_BOUNDARY_HOUR = 17;

export const USER_TIME_ZONE = "Asia/Manila";
```

#### Why this was written this way:
- **Timezone-Native Hours:** Using IANA timezone strings (`Asia/Tokyo`, `Europe/London`, `America/New_York`) allows native JavaScript `Intl` APIs to automatically handle Daylight Saving Time (DST) transitions without manual biannual code updates.

---

### 2. Hydration-Safe Clock Hook (`hooks/useNow.ts`)

Prevents server vs client timestamp mismatch warnings during initial SSR page loads.

**File:** `hooks/useNow.ts`
```typescript
"use client";

import { useEffect, useState } from "react";

/**
 * Returns current Date object updated every second.
 * Returns null on initial server render to ensure hydration matching.
 */
export function useNow(intervalMs: number = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
    setNow(new Date());

    const timer = setInterval(() => {
      setNow(new Date());
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
```

#### Why this was written this way:
- **Hydration Matching:** Returning `null` on the server and initial client render ensures both renders match exactly, avoiding React Error #418/425.

---

### 3. Full Session Bar Component (`components/sessions/SessionBar.tsx`)

**File:** `components/sessions/SessionBar.tsx`
```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clock, Zap } from "lucide-react";
import { useNow } from "@/hooks/useNow";
import { MARKET_SESSIONS } from "@/lib/constants/sessions";
import { getActiveOverlap, getSessionStatus, isForexMarketOpen } from "@/lib/sessions";
import { formatClockPHT } from "@/lib/formatters";
import { SessionCard } from "@/components/sessions/SessionCard";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";

export function SessionBar() {
  const now = useNow();
  const { settings } = useSettings();

  if (!now) {
    return <div className="h-[212px] animate-pulse rounded-xl border border-border bg-card" />;
  }

  const statuses = MARKET_SESSIONS.map((session) => getSessionStatus(session, now));
  const marketOpen = isForexMarketOpen(now);
  const overlap = marketOpen ? getActiveOverlap(statuses) : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm"
    >
      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold tracking-tight">Market Sessions</h2>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              marketOpen
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
          >
            {marketOpen ? "Forex market open" : "Forex market closed — weekend"}
          </span>

          <AnimatePresence>
            {overlap && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400"
              >
                <Zap className="h-3 w-3" />
                {overlap}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
          <Clock className="h-4 w-4" />
          {formatClockPHT(now, true)} PHT
        </div>
      </div>

      {/* Session cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {statuses.map((status) => (
          <SessionCard
            key={status.session.id}
            status={status}
            isFocused={settings.sessionFocus.includes(status.session.id)}
          />
        ))}
      </div>
    </motion.section>
  );
}
```

#### Why this was written this way:
- **Skeleton State on Mount:** Renders a 212px skeleton block while `now` resolves, preventing content layout reflow.
- **Overlap Badge:** AnimatePresence highlights active institutional overlap windows (e.g. London / New York Overlap) in amber with a lightning icon.
