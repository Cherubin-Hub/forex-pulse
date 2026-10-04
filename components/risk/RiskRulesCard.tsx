"use client";

import { ShieldAlert, Target, AlertTriangle } from "lucide-react";
import { useSettings } from "@/components/providers/SettingsProvider";

export function RiskRulesCard() {
  const { settings, isLoaded } = useSettings();

  if (!isLoaded || !settings) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold text-amber-600 dark:text-amber-500">Active Risk Constraints</h3>
      </div>
      
      <ul className="space-y-3">
        <li className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Maximum Risk Per Trade</p>
            <p className="text-xs text-muted-foreground">
              You are strictly limited to risking {settings.riskPerTradePercent}% of your account per setup.
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Target className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Minimum Risk:Reward</p>
            <p className="text-xs text-muted-foreground">
              Any setup with an R:R below 1:{settings.minRiskReward} must be rejected immediately.
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <ShieldAlert className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Max Open Exposures</p>
            <p className="text-xs text-muted-foreground">
              You may only have {settings.maxOpenSetups} setups running concurrently to prevent overexposure.
            </p>
          </div>
        </li>
      </ul>
    </div>
  );
}
