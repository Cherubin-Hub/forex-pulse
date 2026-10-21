"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";
import {
  runMarketScanAction,
  commitScannedSetupAction,
} from "@/app/actions/scannerActions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/formatters";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import type { ScannedOpportunity } from "@/types/scanner";
export function MarketScannerWidget() {
  const { settings, isLoaded, updateSettings } = useSettings();
  const [pending, startTransition] = useTransition(),
    [opportunities, setOpportunities] = useState<ScannedOpportunity[]>([]),
    [scanned, setScanned] = useState(false);
  const scan = () =>
    startTransition(async () => {
      try {
        const result = await runMarketScanAction();
        if (!result.success) throw new Error(result.error);
        setOpportunities(result.result?.opportunities ?? []);
        setScanned(true);
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Scan failed");
      }
    });
  const approve = (opportunity: ScannedOpportunity) =>
    startTransition(async () => {
      const result = await commitScannedSetupAction(opportunity);
      if (result.success) {
        setOpportunities((current) =>
          current.filter((value) => value.id !== opportunity.id),
        );
        toast.success("Setup saved after server risk checks.");
      } else toast.error(result.error);
    });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Market scanner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p>
            {settings.traderProfile.replaceAll("_", " ")} · Minimum{" "}
            {settings.minRiskReward}R
          </p>
          <Button disabled={pending || !isLoaded} onClick={scan}>
            {pending ? "Working…" : "Scan verified market data"}
          </Button>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.automationEnabled}
            disabled={pending || !isLoaded}
            onChange={(event) => {
              const enabled = event.target.checked;
              startTransition(async () => {
                await updateSettings({
                  ...settings,
                  automationEnabled: enabled,
                });
              });
            }}
          />
          <span>
            Enable automatic setup creation and monitoring for this account.
            Turning this off stops browser and scheduled automation.
          </span>
        </label>
        <p className="text-xs text-muted-foreground">
          Scans never save trades by themselves. Manual approval and automatic
          commits both enforce your account risk limits, selected sessions, and
          news buffer.
        </p>
        {scanned && opportunities.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No qualifying setups found.
          </p>
        )}
        {opportunities.map((opportunity) => {
          const decimals =
            INSTRUMENTS.find((value) => value.symbol === opportunity.symbol)
              ?.decimals ?? 5;
          return (
            <div
              key={opportunity.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
            >
              <div>
                <strong>
                  {opportunity.symbol} {opportunity.direction}
                </strong>
                <p className="font-mono text-xs">
                  {formatPrice(opportunity.entryMin, decimals)}–
                  {formatPrice(opportunity.entryMax, decimals)} ·{" "}
                  {opportunity.riskReward}R
                </p>
              </div>
              <Button disabled={pending} onClick={() => approve(opportunity)}>
                Review and save
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
