"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, Loader2, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { createSetupSchema, type CreateSetupFormData } from "@/lib/schemas/setup";
import { createTradingSetup } from "@/app/actions/setupActions";
import { calculateRiskReward } from "@/lib/setupUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const POPULAR_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "XAUUSD"];

export function CreateSetupModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateSetupFormData>({
    resolver: zodResolver(createSetupSchema),
    defaultValues: {
      symbol: "EURUSD",
      direction: "LONG",
      entryMin: 1.125,
      entryMax: 1.126,
      stopLoss: 1.122,
      takeProfit1: 1.132,
      invalidationRule: "H1 candle close beyond stop loss level",
      confluenceTags: "Liquidity Sweep, Order Block",
    },
  });

  const direction = watch("direction");
  const entryMin = Number(watch("entryMin")) || 0;
  const entryMax = Number(watch("entryMax")) || 0;
  const stopLoss = Number(watch("stopLoss")) || 0;
  const takeProfit1 = Number(watch("takeProfit1")) || 0;

  // Real-time R:R preview
  const avgEntry = (entryMin + entryMax) / 2;
  const liveRR = calculateRiskReward(direction, avgEntry, stopLoss, takeProfit1);
  const isHealthyRR = liveRR >= 2.0;

  const onSubmit = (data: CreateSetupFormData) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createTradingSetup(data);
      if (result.success) {
        reset();
        setIsOpen(false);
      } else {
        setFormError(result.error ?? "Failed to save setup.");
      }
    });
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="h-9 gap-1.5 text-xs font-semibold">
        <Plus className="h-4 w-4" />
        Log New Setup
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold tracking-tight">Log Trading Setup</h3>
                <p className="text-xs text-muted-foreground">
                  Define your parameters and verify Risk:Reward confluence.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-500 border border-rose-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
              {/* Symbol & Direction */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Instrument</Label>
                  <Input {...register("symbol")} placeholder="EURUSD" className="h-8 font-mono text-xs uppercase" />
                  <div className="flex gap-1 pt-1">
                    {POPULAR_SYMBOLS.slice(0, 3).map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => setValue("symbol", sym)}
                        className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Direction</Label>
                  <div className="grid grid-cols-2 gap-1 rounded-lg border border-border p-1 bg-muted/40">
                    <button
                      type="button"
                      onClick={() => setValue("direction", "LONG")}
                      className={cn(
                        "flex items-center justify-center gap-1 rounded py-1 text-xs font-semibold",
                        direction === "LONG" ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" /> Long
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("direction", "SHORT")}
                      className={cn(
                        "flex items-center justify-center gap-1 rounded py-1 text-xs font-semibold",
                        direction === "SHORT" ? "bg-rose-500 text-white shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      <ArrowDownRight className="h-3.5 w-3.5" /> Short
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Levels */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Entry Min</Label>
                  <Input type="number" step="any" {...register("entryMin", { valueAsNumber: true })} className="h-8 font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Entry Max</Label>
                  <Input type="number" step="any" {...register("entryMax", { valueAsNumber: true })} className="h-8 font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-rose-500">Stop Loss</Label>
                  <Input type="number" step="any" {...register("stopLoss", { valueAsNumber: true })} className="h-8 font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-emerald-500">Take Profit 1</Label>
                  <Input type="number" step="any" {...register("takeProfit1", { valueAsNumber: true })} className="h-8 font-mono text-xs" />
                </div>
              </div>
              {errors.stopLoss && (
                <p className="text-[11px] text-rose-500">{errors.stopLoss.message}</p>
              )}

              {/* Live R:R Badge */}
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5 text-xs">
                <span className="text-muted-foreground">Calculated R:R Ratio:</span>
                <span className={cn("font-mono font-bold px-2 py-0.5 rounded", isHealthyRR ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500")}>
                  1 : {liveRR.toFixed(1)} {liveRR < 2.0 && "(Below 1:2 Plan Target)"}
                </span>
              </div>

              {/* Invalidation & Confluences */}
              <div className="space-y-1.5">
                <Label className="text-xs">Invalidation Condition</Label>
                <Input {...register("invalidationRule")} placeholder="e.g. H1 close above 1.1290" className="h-8 text-xs" />
                {errors.invalidationRule && (
                  <p className="text-[11px] text-rose-500">{errors.invalidationRule.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Confluence Tags (Comma-separated)</Label>
                <Input {...register("confluenceTags")} placeholder="Liquidity Sweep, Asian High Sweep, Fib 61.8" className="h-8 text-xs" />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Save Setup
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
