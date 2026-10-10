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
