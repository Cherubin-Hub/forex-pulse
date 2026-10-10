# Step 16: Setup State Machine Transition Controls

## 🎯 Objective
Connect the frontend setup cards to backend state mutations using Next.js Server Actions and React's `useTransition` hook. Traders can transition setups across their lifecycle with one click—triggering entries, logging wins (TP reached), recording losses (SL hit), invalidating setups, or deleting setups—with zero full-page reloads, non-blocking asynchronous state transitions, and automatic cache revalidation.

---

## 🛠 Step-by-Step Implementation

### 1. Create Server Actions for Setup State Transitions & Deletion (`app/actions/setupActions.ts`)
Create secure Server Actions to mutate setup records in Supabase with user authentication verification, Row-Level Security compliance, and path revalidations.

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
- **`"use server"` Directive:** Marks functions as Next.js Server Actions, allowing frontend client components to invoke server-side database mutations directly via asynchronous JavaScript calls without creating REST API endpoint routes.
- **Strict Authentication Guard:** Checks `await supabase.auth.getUser()` at the top of every mutation; unauthenticated attempts fail immediately.
- **Row-Level Security Enforcement:** Queries rely on PostgreSQL Row-Level Security policies to ensure a user cannot read, mutate, or delete setups belonging to another trader.
- **Selective Path Revalidation (`revalidatePath`):** Revalidates `/setups`, `/setups/history`, and `/` in Next.js Server Cache, guaranteeing that whenever a setup changes status or is deleted, all views show updated data on the very next render.

---

### 2. Create Interactive Setup Status Action Controls (`components/setups/SetupStatusActions.tsx`)
Create the client component that renders contextual action buttons based on the setup's current state and manages asynchronous transitions with `useTransition`.

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

  // For completed or historical setups, provide clean deletion option
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
- **`useTransition` Non-Blocking UI:** Wraps server mutations inside `startTransition()`. React automatically keeps the interface interactive and sets `isPending = true`, displaying a compact spinner (`<Loader2 className="animate-spin" />`) without freezing the user experience.
- **Context-Sensitive Action Rendering:**
  - If `WAITING_FOR_CONFIRMATION`: Trader can click **Trigger** (moves setup to active `ENTRY_TRIGGERED`), **Invalidate** (structure broken), or **Delete**.
  - If `ENTRY_TRIGGERED`: Trader can log trade completion by clicking **TP Reached** (green win) or **SL Hit** (red loss).
  - If historical/terminal: Displays a trash icon button to remove the archived record if desired.
- **Safety Confirmations:** `handleDelete` prompts the user with `confirm()` to prevent accidental destructive removals.

---

### 3. Integrate Action Controls into Setup Card (`components/setups/SetupCard.tsx`)
Embed `<SetupStatusActions />` directly into the footer of the `SetupCard` component.

**File:** `components/setups/SetupCard.tsx`
```tsx
"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, XCircle, AlertCircle, Activity, type LucideIcon } from "lucide-react";
import type { SetupStatus, TradingSetup } from "@/types/setup";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { SetupStatusActions } from "@/components/setups/SetupStatusActions";

const STATUS_CONFIG: Record<SetupStatus, { label: string; icon: LucideIcon; color: string }> = {
  WAITING_FOR_CONFIRMATION: { label: "Waiting", icon: Clock, color: "text-amber-500 bg-amber-500/10" },
  ENTRY_TRIGGERED: { label: "Active", icon: Activity, color: "text-sky-500 bg-sky-500/10" },
  TP_REACHED: { label: "Won", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
  SL_HIT: { label: "Lost", icon: XCircle, color: "text-rose-500 bg-rose-500/10" },
  INVALIDATED: { label: "Invalidated", icon: AlertCircle, color: "text-slate-500 bg-slate-500/10" },
  EXPIRED: { label: "Expired", icon: Clock, color: "text-slate-500 bg-slate-500/10" },
};

export function SetupCard({ setup }: { setup: TradingSetup }) {
  const isLong = setup.direction === "LONG";
  const instrument = INSTRUMENTS.find((i) => i.symbol === setup.symbol);
  const decimals = instrument?.decimals ?? 5;
  const status = STATUS_CONFIG[setup.status];
  const StatusIcon = status.icon;

  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md",
              isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}>
              {isLong ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            </span>
            <h3 className="font-semibold">{setup.symbol}</h3>
          </div>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", status.color)}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </span>
        </div>

        {/* Price Levels */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Entry Zone</p>
            <p className="font-medium tabular-nums">{formatPrice(setup.entryMin, decimals)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{formatPrice(setup.entryMax, decimals)}</p>
          </div>
          <div className="border-l border-border pl-2">
            <p className="text-xs text-muted-foreground">Stop Loss</p>
            <p className="font-medium tabular-nums text-rose-500">{formatPrice(setup.stopLoss, decimals)}</p>
          </div>
          <div className="border-l border-border pl-2">
            <p className="text-xs text-muted-foreground">Take Profit 1</p>
            <p className="font-medium tabular-nums text-emerald-500">{formatPrice(setup.takeProfit1, decimals)}</p>
          </div>
        </div>

        {/* Confluence Tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {setup.confluenceTags.map((tag) => (
            <span key={tag} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer & Interactive Transitions */}
      <div className="mt-4 flex flex-col gap-2.5 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            Invalidation: {setup.invalidationRule}
          </span>
          <span className="rounded bg-muted px-2 py-1 text-xs font-semibold">
            R:R 1:{setup.riskReward.toFixed(1)}
          </span>
        </div>

        {/* Action Buttons for Pending or Active Setups */}
        <div className="flex justify-end">
          <SetupStatusActions setupId={setup.id} currentStatus={setup.status} />
        </div>
      </div>
    </motion.article>
  );
}
```

#### Why this was written this way:
- **Clean Footer Layout:** The action buttons sit in the bottom-right corner of each card footer, right alongside the invalidation rule note and R:R pill.
- **Declarative Props:** Passing `setupId` and `currentStatus` cleanly isolates action concerns from card rendering.

---

## 🧪 Verification & Testing
1. On `/setups`, locate a setup with status `Waiting` (`WAITING_FOR_CONFIRMATION`).
2. Click the **Trigger** button. Verify that the button switches to a spinning loader, and upon resolution, the card badge updates to **Active** (`ENTRY_TRIGGERED`).
3. On an active setup card, click **TP Reached**. Verify that the setup moves into Setup History (`/setups/history`) as a winning trade (`TP_REACHED`).
4. On a pending setup card, click **Invalidate**. Verify that it immediately leaves active setups and moves into history with the `Invalidated` badge.
5. Click the trash icon and confirm the alert modal. Confirm that the setup is deleted from the screen.
