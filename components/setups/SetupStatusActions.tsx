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
