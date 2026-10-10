# Step 26: Supabase Realtime WebSocket Synchronization & Trade Cleanup

## 🎯 Overview
In this step, we implement live multi-tab and multi-device data synchronization using Supabase WebSocket Change Data Capture (CDC), add a secure trade deletion Server Action, build interactive deletion controls into the UI, resolve Base UI dropdown compatibility in the navigation header, and provide the consolidated PostgreSQL table script.

---

### 1. Fix `components/layout/UserNav.tsx` (Resolving TS Error)

Your project's `dropdown-menu.tsx` uses Base UI (`@base-ui/react/menu`), which uses `render={<... />}` props rather than Radix UI's `asChild` / `forceMount`.

Replace the content of `components/layout/UserNav.tsx` with this Base UI compatible version:

**File:** `components/layout/UserNav.tsx`
```tsx
"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/authActions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

export function UserNav() {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            FP
          </Button>
        }
      />
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Forex Trader</p>
            <p className="text-xs leading-none text-muted-foreground">Active Session</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <User className="mr-2 h-4 w-4" />
          <span>Risk Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            await logout();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### Why this was written this way:
- **Base UI Integration:** Base UI triggers accept a `render` property containing the target JSX node instead of Radix's `asChild`, resolving the `TS2322` property mismatch.
- **Client Route Push:** Using `router.push("/settings")` handles client-side transitions cleanly without nesting `<a>` tags inside menu buttons.
- **Destructive Theme Styling:** `variant="destructive"` leverages your design system's red styling for sign-out actions.

---

### 2. Add `deleteTradingSetup` Action to `app/actions/setupActions.ts`

When trades are mistakenly logged or canceled, traders need a way to delete them. This server action enforces authentication and Row Level Security before purging the setup from Supabase.

Here is the complete code for `app/actions/setupActions.ts`:

**File:** `app/actions/setupActions.ts`
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SetupStatus } from "@/types/setup";
import { createSetupSchema, type CreateSetupFormData } from "@/lib/schemas/setup";
import { calculateRiskReward } from "@/lib/setupUtils";

export interface UpdateStatusResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action to update the lifecycle status of an existing trading setup.
 * Persists directly to Supabase and revalidates relevant dashboard pages.
 */
export async function updateSetupStatus(
  setupId: string,
  newStatus: SetupStatus
): Promise<UpdateStatusResult> {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 2. Update status (RLS guarantees update only succeeds if user owns the record)
    const { error } = await supabase
      .from("trading_setups")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", setupId);

    if (error) {
      console.error("Failed to update setup status:", error.message);
      return { success: false, error: error.message };
    }

    // 3. Revalidate affected routes so UI refreshes immediately
    revalidatePath("/setups");
    revalidatePath("/setups/history");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Server Action to create and persist a new trading setup in Supabase.
 */
export async function createTradingSetup(
  formData: CreateSetupFormData
): Promise<UpdateStatusResult> {
  try {
    const validated = createSetupSchema.parse(formData);
    const supabase = await createServerSupabaseClient();

    // 1. Enforce active authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const avgEntry = (validated.entryMin + validated.entryMax) / 2;
    const riskReward = calculateRiskReward(
      validated.direction,
      avgEntry,
      validated.stopLoss,
      validated.takeProfit1
    );

    const confluenceTags = validated.confluenceTags
      ? validated.confluenceTags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    // 2. Persist setup explicitly tagged with user.id
    const { error } = await supabase.from("trading_setups").insert({
      user_id: user.id,
      symbol: validated.symbol,
      direction: validated.direction,
      entry_min: validated.entryMin,
      entry_max: validated.entryMax,
      stop_loss: validated.stopLoss,
      take_profit_1: validated.takeProfit1,
      take_profit_2: null,
      risk_reward: riskReward,
      status: "WAITING_FOR_CONFIRMATION",
      invalidation_rule: validated.invalidationRule,
      notes: validated.notes ?? null,
      confluence_tags: confluenceTags,
    });

    if (error) {
      console.error("Supabase setup creation error:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/setups");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create setup";
    return { success: false, error: message };
  }
}

/**
 * Server Action to delete a trading setup.
 * Protected by authentication and Row Level Security.
 */
export async function deleteTradingSetup(
  setupId: string
): Promise<UpdateStatusResult> {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Enforce authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 2. Perform deletion (RLS ensures users only delete their own setups)
    const { error } = await supabase
      .from("trading_setups")
      .delete()
      .eq("id", setupId);

    if (error) {
      console.error("Failed to delete setup:", error.message);
      return { success: false, error: error.message };
    }

    // 3. Revalidate dashboard caches
    revalidatePath("/setups");
    revalidatePath("/setups/history");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete setup";
    return { success: false, error: message };
  }
}
```

#### Why this was written this way:
- **Server Identity Verification:** It executes `supabase.auth.getUser()` to ensure an active session exists before executing database queries.
- **Row-Level Security Defense:** Even if an attacker passes an arbitrary ID, Supabase's `auth.uid() = user_id` delete policy blocks unauthorized row deletion at the PostgreSQL level.
- **Multi-Route Revalidation:** `revalidatePath` purges caches for `/setups`, `/setups/history`, and the root `/` overview page, updating cards and win-rate statistics immediately.

---

### 3. Update `components/setups/SetupStatusActions.tsx` with Deletion Control

Traders need to be able to delete setups directly from their cards. This updates the component to include a confirmation dialog, trash icon, and `useTransition` loading spinner.

**File:** `components/setups/SetupStatusActions.tsx`
```tsx
"use client";

import { useTransition } from "react";
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Ban, 
  Trash2,
  Loader2 
} from "lucide-react";
import type { SetupStatus } from "@/types/setup";
import { updateSetupStatus, deleteTradingSetup } from "@/app/actions/setupActions";
import { Button } from "@/components/ui/button";

interface SetupStatusActionsProps {
  setupId: string;
  currentStatus: SetupStatus;
}

export function SetupStatusActions({ setupId, currentStatus }: SetupStatusActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleTransition = (nextStatus: SetupStatus) => {
    startTransition(async () => {
      const result = await updateSetupStatus(setupId, nextStatus);
      if (!result.success) {
        alert(`Failed to update trade: ${result.error}`);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this trading setup?")) return;
    startTransition(async () => {
      const result = await deleteTradingSetup(setupId);
      if (!result.success) {
        alert(`Failed to delete setup: ${result.error}`);
      }
    });
  };

  if (isPending) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Updating...</span>
      </div>
    );
  }

  // Actions available when WAITING_FOR_CONFIRMATION
  if (currentStatus === "WAITING_FOR_CONFIRMATION") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px] text-sky-500 border-sky-500/30 hover:bg-sky-500/10"
          onClick={() => handleTransition("ENTRY_TRIGGERED")}
          title="Trigger Entry"
        >
          <Play className="h-3 w-3 mr-1 fill-sky-500" />
          Trigger
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => handleTransition("INVALIDATED")}
          title="Structure Broken"
        >
          <Ban className="h-3 w-3 mr-1" />
          Invalidate
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          title="Delete Setup"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // Actions available when ENTRY_TRIGGERED (Active Trade)
  if (currentStatus === "ENTRY_TRIGGERED") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px] text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
          onClick={() => handleTransition("TP_REACHED")}
          title="Log Win (Take Profit Reached)"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          TP Reached
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px] text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
          onClick={() => handleTransition("SL_HIT")}
          title="Log Loss (Stop Loss Hit)"
        >
          <XCircle className="h-3 w-3 mr-1" />
          SL Hit
        </Button>
      </div>
    );
  }

  // Completed trades (TP_REACHED, SL_HIT, INVALIDATED, EXPIRED) show delete option
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive ml-auto"
      onClick={handleDelete}
      title="Delete Setup"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
```

#### Why this was written this way:
- **`useTransition` Non-Blocking State:** Encapsulating mutations inside `startTransition` enables the `<Loader2 />` spin indicator without disabling or freezing other interactive controls on the page.
- **Accidental Deletion Protection:** Standard browser confirmation guard `confirm(...)` prevents misclicks on live positions.

---

### 4. Create Headless Realtime Listener (`components/setups/SetupRealtimeListener.tsx`)

In institutional trading, trades triggered or closed on a mobile device or secondary monitor must synchronize live across all open sessions without requiring manual page refreshes.

**File:** `components/setups/SetupRealtimeListener.tsx`
```tsx
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
    const supabase = createClient();

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
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
```

#### Why this was written this way:
- **Zero DOM Footprint:** Returning `null` creates a headless hook-in-a-component that introduces zero markup, CSS, or layout reflows.
- **WebSocket Change Data Capture:** Subscribing to `postgres_changes` listens directly to Supabase's realtime replication stream.
- **Background Refresh:** Calling `router.refresh()` instructs Next.js App Router to fetch new data on the server and re-render without losing client scroll position or resetting open modal states.

---

### 5. Mount the Listener in `app/(dashboard)/setups/page.tsx`

Mount the headless listener at the top of the setups page Server Component.

**File:** `app/(dashboard)/setups/page.tsx`
```tsx
import { getActiveSetups } from "@/lib/services/setups";
import { SetupGrid } from "@/components/setups/SetupGrid";
import { CreateSetupModal } from "@/components/setups/CreateSetupModal";
import { SetupRealtimeListener } from "@/components/setups/SetupRealtimeListener";

export default async function SetupsPage() {
  const setups = await getActiveSetups();

  return (
    <div className="space-y-6">
      {/* Realtime WebSocket subscription */}
      <SetupRealtimeListener />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Active Setups</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Trades waiting for entry confirmation or currently active in the market.
          </p>
        </div>
        <CreateSetupModal />
      </div>

      <SetupGrid setups={setups} />
    </div>
  );
}
```

#### Why this was written this way:
- Combines the fast initial HTML delivery of Server Components with the live interactivity of WebSockets.

---

### 6. Consolidated PostgreSQL Script (`lib/supabase/schema/01_tables/01_tbl_trading_setups.sql`)

Instead of requiring developers to run loose `ALTER` commands separately in the Supabase console, this single script defines the table, enables Row-Level Security, and idempotently registers the table into the `supabase_realtime` publication inside an atomic transaction block.

**File:** `lib/supabase/schema/01_tables/01_tbl_trading_setups.sql`
```sql
-- ============================================================================
-- SCRIPT: 01_tbl_trading_setups.sql
-- TYPE:   Table Definition & Configuration
-- TABLE:  public.trading_setups
-- ============================================================================

BEGIN;

-- 1. Table Schema Definition
CREATE TABLE IF NOT EXISTS public.trading_setups (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol             TEXT NOT NULL,
    direction          TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    entry_min          NUMERIC(15, 5) NOT NULL,
    entry_max          NUMERIC(15, 5) NOT NULL,
    stop_loss          NUMERIC(15, 5) NOT NULL,
    take_profit_1      NUMERIC(15, 5) NOT NULL,
    take_profit_2      NUMERIC(15, 5) DEFAULT NULL,
    risk_reward        NUMERIC(6, 2) NOT NULL,
    status             TEXT NOT NULL CHECK (status IN (
                           'WAITING_FOR_CONFIRMATION',
                           'ENTRY_TRIGGERED',
                           'TP_REACHED',
                           'SL_HIT',
                           'INVALIDATED',
                           'EXPIRED'
                       )),
    invalidation_rule  TEXT NOT NULL,
    notes              TEXT DEFAULT NULL,
    confluence_tags    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now()),
    updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

-- 2. Enable Row-Level Security immediately on table creation
ALTER TABLE public.trading_setups ENABLE ROW LEVEL SECURITY;

-- 3. Attach Table to Supabase Realtime Publication (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'trading_setups'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_setups;
    END IF;
END $$;

COMMIT;
```

#### Why this was written this way:
- **Atomicity (`BEGIN; ... COMMIT;`):** If any syntax check or constraint fails, the entire transaction rolls back cleanly without leaving orphan tables or broken permissions.
- **Immediate RLS Activation:** Turning on RLS right after creation prevents any window of unauthenticated exposure.
- **Idempotency Guard (`DO $$` block):** Running `ALTER PUBLICATION ... ADD TABLE` on a table that is already a member throws an error in PostgreSQL. Querying `pg_publication_tables` first ensures developers can re-run this migration multiple times without errors.
