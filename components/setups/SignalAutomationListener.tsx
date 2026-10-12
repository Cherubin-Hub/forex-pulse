"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Zap, ShieldCheck, ArrowRightCircle } from "lucide-react";
import type { PriceQuote } from "@/types/market";
import type { TradingSetup } from "@/types/setup";
import { getSavedAlerts, saveAlerts, evaluateSignalsAndAlerts } from "@/lib/services/alertEngine";
import { updateSetupStatus, setSetupToBreakeven } from "@/app/actions/setupActions";

interface SignalAutomationListenerProps {
  quotes: PriceQuote[];
  setups: TradingSetup[];
}

export function SignalAutomationListener({ quotes, setups }: SignalAutomationListenerProps) {
  const isExecuting = useRef<boolean>(false);

  useEffect(() => {
    if (isExecuting.current || quotes.length === 0) return;

    const currentAlerts = getSavedAlerts();
    if (currentAlerts.filter((a) => a.status === "ACTIVE").length === 0) return;

    const { firedResults, updatedAlerts } = evaluateSignalsAndAlerts(currentAlerts, quotes, setups);

    if (firedResults.length > 0) {
      isExecuting.current = true;
      saveAlerts(updatedAlerts);

      firedResults.forEach(async (result) => {
        const { alert, action, setupId, description } = result;

        if (action === "AUTO_TRIGGER" && setupId) {
          toast.info(`⚡ Auto-Triggering Setup: ${alert.symbol}`, {
            description: `${description} Transitioning to ENTRY_TRIGGERED.`,
            icon: <Zap className="h-4 w-4 text-amber-500" />,
          });
          const res = await updateSetupStatus(setupId, "ENTRY_TRIGGERED");
          if (res.success) {
            toast.success(`Setup ${alert.symbol} Triggered Successfully`);
          } else {
            toast.error(`Auto-Trigger Failed: ${res.error}`);
          }
        } else if (action === "AUTO_BREAKEVEN" && setupId) {
          toast.success(`🛡️ Auto-Breakeven Activated: ${alert.symbol}`, {
            description: `${description} Moving Stop Loss to Breakeven.`,
            icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />,
          });
          const res = await setSetupToBreakeven(setupId);
          if (res.success) {
            toast.success(`Stop Loss Trailed to Breakeven for ${alert.symbol}`);
          }
        } else {
          // Standard Notification Alert
          toast.warning(`Signal Alert: ${alert.symbol}`, {
            description,
            icon: <ArrowRightCircle className="h-4 w-4 text-sky-500" />,
            duration: 8000,
          });
        }
      });

      // Small cooldown to prevent duplicate fires
      setTimeout(() => {
        isExecuting.current = false;
      }, 3000);
    }
  }, [quotes, setups]);

  return null; // Headless component
}
