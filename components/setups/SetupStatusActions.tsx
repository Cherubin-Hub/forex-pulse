"use client";
import { useSettings } from "@/hooks/useSettings";

import { useState, useEffect, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2, Award, Clock, Activity, ShieldCheck } from "lucide-react";
import type { TradingSetup, SetupStatus } from "@/types/setup";
import {
  deleteTradingSetup,
  checkSetupMarketStatus,
  setSetupToBreakeven,
} from "@/app/actions/setupActions";
import { TradePostMortemModal } from "@/components/setups/TradePostMortemModal";
import {
  loadAllPostMortems,
  getGradeBadgeColor,
  type TradePostMortem,
} from "@/lib/postMortemUtils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SetupStatusActionsProps {
  setup: TradingSetup;
}

export function SetupStatusActions({ setup }: SetupStatusActionsProps) {
  const { identity, settings } = useSettings();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPostMortemOpen, setIsPostMortemOpen] = useState(false);
  const [review, setReview] = useState<TradePostMortem | null>(null);

  // Optimistic UI for instant transitions without waiting for network latency
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    setup.status,
    (_current, next: SetupStatus) => next
  );

  // Sync post-mortem reviews from localStorage
  useEffect(() => {
    const allReviews = loadAllPostMortems(identity?.userId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
    if (allReviews[setup.id]) setReview(allReviews[setup.id]);
  }, [setup.id, identity?.userId]);

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete the ${setup.symbol} setup?`))
      return;
    startTransition(async () => {
      setOptimisticStatus("INVALIDATED");
      const result = await deleteTradingSetup(setup.id);
      if (result.success) {
        toast.success(`Deleted ${setup.symbol} setup.`);
        router.refresh();
      } else {
        toast.error(`Failed to delete setup: ${result.error}`);
      }
    });
  };

  const handleCheck = () =>
    startTransition(async () => {
      const result = await checkSetupMarketStatus(setup.id);
      if (result.success) {
        toast.success("Trade status updated from verified market data.");
        router.refresh();
      } else {
        toast.info(result.error);
      }
    });

  const handleBreakeven = () =>
    startTransition(async () => {
      const result = await setSetupToBreakeven(setup.id);
      if (result.success) {
        toast.success(`Moved ${setup.symbol} Stop Loss to Breakeven (+1R move confirmed).`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  if (isPending) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1 font-mono">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span>Evaluating status...</span>
      </div>
    );
  }

  // Pending setup: Waiting for Entry Zone
  if (optimisticStatus === "WAITING_FOR_CONFIRMATION") {
    return (
      <div className="flex items-center justify-between w-full gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-500/90 font-medium px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Clock className="h-3 w-3 animate-pulse" />
          <span>
            {settings.automationEnabled
              ? "Entry monitored"
              : "Pending manual check"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={handleCheck} className="text-xs h-7">
            Check market
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            title="Delete pending setup"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Active trade: Automatically identified TP and SL with Breakeven trigger
  if (optimisticStatus === "ENTRY_TRIGGERED") {
    return (
      <div className="flex items-center justify-between w-full gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-sky-400 font-medium px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
          <Activity className="h-3 w-3 animate-pulse text-sky-400" />
          <span>
            {settings.automationEnabled
              ? "TP/SL monitored"
              : "Active trade"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleBreakeven}
            className="text-xs h-7 gap-1 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
            title="Lock in profit and set Stop Loss to Entry price (Requires +1R gain)"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Breakeven
          </Button>
          <Button size="sm" variant="outline" onClick={handleCheck} className="text-xs h-7">
            Check market
          </Button>
        </div>
      </div>
    );
  }

  // Completed or historical setups (TP_REACHED, SL_HIT, INVALIDATED, EXPIRED)
  return (
    <>
      <div className="flex items-center gap-1.5 ml-auto">
        {/* Post-Mortem Review Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsPostMortemOpen(true)}
          className={cn(
            "h-7 px-2.5 text-[11px] font-semibold gap-1.5 transition-colors rounded-lg",
            review
              ? getGradeBadgeColor(review.grade)
              : "border-border text-muted-foreground hover:text-foreground",
          )}
          title="Log Trade Review & Process Grade"
        >
          <Award className="h-3.5 w-3.5" />
          {review
            ? `Grade ${review.grade} (${review.disciplineScore}%)`
            : "Post-Mortem"}
        </Button>
      </div>

      {/* Trade Post-Mortem Modal */}
      <TradePostMortemModal
        setup={setup}
        isOpen={isPostMortemOpen}
        onClose={() => setIsPostMortemOpen(false)}
        existingReview={review}
        onSave={(saved) => setReview(saved)}
      />
    </>
  );
}
