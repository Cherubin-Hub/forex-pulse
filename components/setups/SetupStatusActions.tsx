"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Ban, 
  Trash2, 
  Loader2,
  ShieldCheck,
  Award,
} from "lucide-react";
import type { SetupStatus, TradingSetup } from "@/types/setup";
import { updateSetupStatus, deleteTradingSetup, setSetupToBreakeven } from "@/app/actions/setupActions";
import { PreTradeGatekeeperModal } from "@/components/setups/PreTradeGatekeeperModal";
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
  const [isPending, startTransition] = useTransition();
  const [isGatekeeperOpen, setIsGatekeeperOpen] = useState(false);
  const [isPostMortemOpen, setIsPostMortemOpen] = useState(false);
  const [review, setReview] = useState<TradePostMortem | null>(null);

  // Sync post-mortem reviews from localStorage
  useEffect(() => {
    const allReviews = loadAllPostMortems();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
    if (allReviews[setup.id]) setReview(allReviews[setup.id]);
  }, [setup.id]);

  const handleTransition = (nextStatus: SetupStatus) => {
    startTransition(async () => {
      const result = await updateSetupStatus(setup.id, nextStatus);
      if (!result.success) {
        alert(`Failed to update trade: ${result.error}`);
      }
    });
  };

  const handleBreakeven = () => {
    startTransition(async () => {
      const result = await setSetupToBreakeven(setup.id);
      if (!result.success) {
        alert(`Failed to set Breakeven: ${result.error}`);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this trading setup?")) return;
    startTransition(async () => {
      const result = await deleteTradingSetup(setup.id);
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
  if (setup.status === "WAITING_FOR_CONFIRMATION") {
    return (
      <>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px] text-sky-500 border-sky-500/30 hover:bg-sky-500/10"
            onClick={() => setIsGatekeeperOpen(true)}
            title="Pre-Flight Risk Check & Trigger"
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

        {/* Pre-Trade Disciplinarian Gatekeeper Modal */}
        <PreTradeGatekeeperModal
          setup={setup}
          isOpen={isGatekeeperOpen}
          onClose={() => setIsGatekeeperOpen(false)}
          onConfirm={() => handleTransition("ENTRY_TRIGGERED")}
        />
      </>
    );
  }

  // Actions available when ENTRY_TRIGGERED (Active Trade)
  if (setup.status === "ENTRY_TRIGGERED") {
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
            "h-7 px-2 text-[11px] font-semibold gap-1 transition-colors",
            review
              ? getGradeBadgeColor(review.grade)
              : "border-border text-muted-foreground hover:text-foreground"
          )}
          title="Log Trade Review & Process Grade"
        >
          <Award className="h-3 w-3" />
          {review ? `Grade ${review.grade} (${review.disciplineScore}%)` : "Post-Mortem"}
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
