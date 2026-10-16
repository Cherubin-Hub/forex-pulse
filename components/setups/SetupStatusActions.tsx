"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Trash2, 
  Loader2,
  Award,
  Clock,
  Activity,
} from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { deleteTradingSetup } from "@/app/actions/setupActions";
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPostMortemOpen, setIsPostMortemOpen] = useState(false);
  const [review, setReview] = useState<TradePostMortem | null>(null);

  // Sync post-mortem reviews from localStorage
  useEffect(() => {
    const allReviews = loadAllPostMortems();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
    if (allReviews[setup.id]) setReview(allReviews[setup.id]);
  }, [setup.id]);

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete the ${setup.symbol} setup?`)) return;
    startTransition(async () => {
      const result = await deleteTradingSetup(setup.id);
      if (result.success) {
        toast.success(`Deleted ${setup.symbol} setup`);
        router.refresh();
      } else {
        toast.error(`Failed to delete setup: ${result.error}`);
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

  // Pending setup: Waiting for Entry Zone (Automated identification)
  if (setup.status === "WAITING_FOR_CONFIRMATION") {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-500/90 font-medium px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
          <Clock className="h-3 w-3 animate-pulse" />
          <span>Auto-Entry Monitored</span>
        </div>

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

  // Active trade: Automatically identified TP and SL
  if (setup.status === "ENTRY_TRIGGERED") {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-sky-400 font-medium px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
          <Activity className="h-3 w-3 animate-pulse text-sky-400" />
          <span>Auto-Resolving TP/SL</span>
        </div>

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
