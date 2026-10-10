# Step 31: Trade Setup Modification & Breakeven Protection

## 🎯 Objective
Complete the Trade Setup lifecycle by introducing full setup editing capabilities and a one-click **Breakeven (BE) Risk Protection** action. Traders can adjust price targets, refine entry zones, update invalidation parameters, add post-entry reflections, and immediately trail an active trade's stop loss to its entry price to eliminate capital risk.

---

## 🛠 Step-by-Step Implementation

### 1. Extend Setup Server Actions (`app/actions/setupActions.ts`)
Add `updateTradingSetup` and `setSetupToBreakeven` actions with authentication enforcement, Zod boundary verification, and cache revalidation.

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
 */
export async function updateSetupStatus(
  setupId: string,
  newStatus: SetupStatus
): Promise<UpdateStatusResult> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

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
 * Server Action to modify and update parameters of an existing trading setup.
 */
export async function updateTradingSetup(
  setupId: string,
  formData: CreateSetupFormData
): Promise<UpdateStatusResult> {
  try {
    const validated = createSetupSchema.parse(formData);
    const supabase = await createServerSupabaseClient();

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

    const { error } = await supabase
      .from("trading_setups")
      .update({
        symbol: validated.symbol,
        direction: validated.direction,
        entry_min: validated.entryMin,
        entry_max: validated.entryMax,
        stop_loss: validated.stopLoss,
        take_profit_1: validated.takeProfit1,
        risk_reward: riskReward,
        invalidation_rule: validated.invalidationRule,
        notes: validated.notes ?? null,
        confluence_tags: confluenceTags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", setupId);

    if (error) {
      console.error("Supabase setup update error:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/setups");
    revalidatePath("/setups/history");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update setup";
    return { success: false, error: message };
  }
}

/**
 * Server Action to immediately trail an active trade's stop loss to Breakeven (entry midpoint).
 */
export async function setSetupToBreakeven(
  setupId: string
): Promise<UpdateStatusResult> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 1. Fetch current setup to determine entry midpoint
    const { data: setup, error: fetchError } = await supabase
      .from("trading_setups")
      .select("entry_min, entry_max, notes")
      .eq("id", setupId)
      .single();

    if (fetchError || !setup) {
      return { success: false, error: "Setup not found." };
    }

    const avgEntry = (Number(setup.entry_min) + Number(setup.entry_max)) / 2;
    const updatedNotes = setup.notes 
      ? `${setup.notes} [SL moved to Breakeven @ ${avgEntry}]`
      : `[SL moved to Breakeven @ ${avgEntry}]`;

    // 2. Persist Breakeven Stop Loss
    const { error: updateError } = await supabase
      .from("trading_setups")
      .update({
        stop_loss: avgEntry,
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", setupId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/setups");
    revalidatePath("/setups/history");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to set Breakeven";
    return { success: false, error: message };
  }
}

/**
 * Server Action to delete a trading setup.
 */
export async function deleteTradingSetup(
  setupId: string
): Promise<UpdateStatusResult> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("trading_setups")
      .delete()
      .eq("id", setupId);

    if (error) {
      console.error("Failed to delete setup:", error.message);
      return { success: false, error: error.message };
    }

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
- **`updateTradingSetup`:** Re-validates the modified inputs with Zod to prevent invalid geometric inversions (such as setting an SL above entry on a Long) and automatically recalculates the new R:R ratio.
- **`setSetupToBreakeven`:** Calculates the midpoint of the entry zone `(entry_min + entry_max) / 2` and sets `stop_loss` to that exact price with an annotated timestamp note.

---

### 2. Create Edit Setup Modal Component (`components/setups/EditSetupModal.tsx`)
Create a pre-populated edit dialog enabling traders to adjust targets, notes, and rules.

**File:** `components/setups/EditSetupModal.tsx`
```tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, X, Loader2, AlertCircle } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { createSetupSchema, type CreateSetupFormData } from "@/lib/schemas/setup";
import { updateTradingSetup } from "@/app/actions/setupActions";
import { calculateRiskReward } from "@/lib/setupUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditSetupModal({ setup }: { setup: TradingSetup }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateSetupFormData>({
    resolver: zodResolver(createSetupSchema),
    defaultValues: {
      symbol: setup.symbol,
      direction: setup.direction,
      entryMin: setup.entryMin,
      entryMax: setup.entryMax,
      stopLoss: setup.stopLoss,
      takeProfit1: setup.takeProfit1,
      invalidationRule: setup.invalidationRule,
      notes: setup.notes,
      confluenceTags: setup.confluenceTags.join(", "),
    },
  });

  const direction = watch("direction");
  const entryMin = Number(watch("entryMin")) || 0;
  const entryMax = Number(watch("entryMax")) || 0;
  const stopLoss = Number(watch("stopLoss")) || 0;
  const takeProfit1 = Number(watch("takeProfit1")) || 0;

  const currentRR = calculateRiskReward(
    direction,
    (entryMin + entryMax) / 2,
    stopLoss,
    takeProfit1
  );

  const onSubmit = (data: CreateSetupFormData) => {
    setFormError(null);
    startTransition(async () => {
      const result = await updateTradingSetup(setup.id, data);
      if (result.success) {
        setIsOpen(false);
      } else {
        setFormError(result.error ?? "Failed to update setup.");
      }
    });
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen(true)}
        title="Edit Setup Parameters"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold tracking-tight">Edit Trading Setup</h3>
                <p className="text-xs text-muted-foreground">
                  Update parameters for {setup.symbol} ({setup.direction})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
              {/* Entry Zone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="entryMin" className="text-xs">Entry Zone Min</Label>
                  <Input
                    id="entryMin"
                    type="number"
                    step="any"
                    {...register("entryMin", { valueAsNumber: true })}
                    className="h-8 text-xs font-mono"
                  />
                  {errors.entryMin && <p className="text-[11px] text-destructive">{errors.entryMin.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="entryMax" className="text-xs">Entry Zone Max</Label>
                  <Input
                    id="entryMax"
                    type="number"
                    step="any"
                    {...register("entryMax", { valueAsNumber: true })}
                    className="h-8 text-xs font-mono"
                  />
                  {errors.entryMax && <p className="text-[11px] text-destructive">{errors.entryMax.message}</p>}
                </div>
              </div>

              {/* Stop Loss & Take Profit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="stopLoss" className="text-xs text-rose-500">Stop Loss</Label>
                  <Input
                    id="stopLoss"
                    type="number"
                    step="any"
                    {...register("stopLoss", { valueAsNumber: true })}
                    className="h-8 text-xs font-mono border-rose-500/30"
                  />
                  {errors.stopLoss && <p className="text-[11px] text-destructive">{errors.stopLoss.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="takeProfit1" className="text-xs text-emerald-500">Take Profit 1</Label>
                  <Input
                    id="takeProfit1"
                    type="number"
                    step="any"
                    {...register("takeProfit1", { valueAsNumber: true })}
                    className="h-8 text-xs font-mono border-emerald-500/30"
                  />
                  {errors.takeProfit1 && <p className="text-[11px] text-destructive">{errors.takeProfit1.message}</p>}
                </div>
              </div>

              {/* Live R:R Preview */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2.5 text-xs">
                <span className="text-muted-foreground font-medium">Updated R:R Ratio:</span>
                <span className={`font-mono font-bold ${currentRR >= 2 ? "text-emerald-500" : "text-amber-500"}`}>
                  1:{currentRR.toFixed(1)} RR
                </span>
              </div>

              {/* Invalidation Rule */}
              <div className="space-y-1">
                <Label htmlFor="invalidationRule" className="text-xs">Invalidation Rule</Label>
                <Input
                  id="invalidationRule"
                  {...register("invalidationRule")}
                  className="h-8 text-xs"
                />
                {errors.invalidationRule && <p className="text-[11px] text-destructive">{errors.invalidationRule.message}</p>}
              </div>

              {/* Confluence Tags */}
              <div className="space-y-1">
                <Label htmlFor="confluenceTags" className="text-xs">Confluence Tags (comma separated)</Label>
                <Input
                  id="confluenceTags"
                  {...register("confluenceTags")}
                  className="h-8 text-xs"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs">Trade Notes & Reflections</Label>
                <Input
                  id="notes"
                  {...register("notes")}
                  className="h-8 text-xs"
                />
              </div>

              {/* Error Message */}
              {formError && (
                <div className="flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="gap-1.5"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

#### Why this was written this way:
- **Pre-populated Form State:** Seamlessly loads current values from the setup prop (`setup.entryMin`, `setup.stopLoss`, etc.), avoiding empty inputs.
- **Dynamic R:R recalculation:** Real-time feedback updates as the trader drags or types modified stop loss or take profit levels.

---

### 3. Upgrade Setup Card with Edit Modal & Breakeven Action (`components/setups/SetupCard.tsx` & `components/setups/SetupStatusActions.tsx`)

#### A. Update [`components/setups/SetupCard.tsx`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/components/setups/SetupCard.tsx)
Integrate the `<EditSetupModal />` trigger right beside the symbol in the card header.

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
import { EditSetupModal } from "@/components/setups/EditSetupModal";

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
            {/* Quick Edit Modal */}
            <EditSetupModal setup={setup} />
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
          <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={setup.invalidationRule}>
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

#### B. Update [`components/setups/SetupStatusActions.tsx`](file:///c:/Users/ADMIN/Documents/MyWork/forex-pulse/components/setups/SetupStatusActions.tsx)
Add the **Breakeven (BE)** action button when status is `ENTRY_TRIGGERED`.

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
  Loader2,
  ShieldCheck
} from "lucide-react";
import type { SetupStatus } from "@/types/setup";
import { updateSetupStatus, deleteTradingSetup, setSetupToBreakeven } from "@/app/actions/setupActions";
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

  const handleBreakeven = () => {
    startTransition(async () => {
      const result = await setSetupToBreakeven(setupId);
      if (!result.success) {
        alert(`Failed to set Breakeven: ${result.error}`);
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
          className="h-7 px-2 text-[11px] text-sky-500 border-sky-500/30 hover:bg-sky-500/10"
          onClick={handleBreakeven}
          title="Move Stop Loss to Entry Midpoint (Risk-Free)"
        >
          <ShieldCheck className="h-3 w-3 mr-1" />
          BE
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px] text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
          onClick={() => handleTransition("TP_REACHED")}
          title="Log Win (Take Profit Reached)"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          TP Hit
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

---

## 🧪 Verification & Testing
1. Navigate to `http://localhost:3000/setups`.
2. On any setup card, click the pencil icon next to the pair symbol.
3. Confirm that the modal opens with the setup's current prices and notes pre-filled.
4. Modify the `Take Profit 1` price and verify that the R:R indicator updates in real time. Click **Save Changes**.
5. Trigger an entry on a pending trade so its badge becomes **Active** (`ENTRY_TRIGGERED`).
6. Click the new **BE** button. Verify that the Stop Loss updates to the exact midpoint of the entry zone, and the card's Stop Loss price updates instantly.

