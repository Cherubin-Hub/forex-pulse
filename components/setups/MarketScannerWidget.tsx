"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Radar,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Sparkles,
  Zap,
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import {
  runMarketScanAction,
  commitScannedSetupAction,
} from "@/app/actions/scannerActions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/formatters";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import type { ScannedOpportunity } from "@/types/scanner";
import { cn } from "@/lib/utils";

export function MarketScannerWidget() {
  const { settings, isLoaded, updateSettings } = useSettings();
  const [pending, startTransition] = useTransition();
  const [opportunities, setOpportunities] = useState<ScannedOpportunity[]>([]);
  const [scanned, setScanned] = useState(false);

  const scan = () =>
    startTransition(async () => {
      try {
        const result = await runMarketScanAction();
        if (!result.success) throw new Error(result.error);
        setOpportunities(result.result?.opportunities ?? []);
        setScanned(true);
        const count = result.result?.opportunities?.length ?? 0;
        if (count > 0) {
          toast.success(`Scan complete: found ${count} qualifying setup${count > 1 ? "s" : ""}.`);
        } else {
          toast.info("Scan complete: no setups currently meet your strict risk criteria.");
        }
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Market scan failed.");
      }
    });

  const approve = (opportunity: ScannedOpportunity) =>
    startTransition(async () => {
      const result = await commitScannedSetupAction(opportunity);
      if (result.success) {
        setOpportunities((current) =>
          current.filter((value) => value.id !== opportunity.id),
        );
        toast.success(`Setup for ${opportunity.symbol} saved after server risk verification.`);
      } else {
        toast.error(result.error || "Failed to commit setup.");
      }
    });

  return (
    <Card className="glass shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Radar className={cn("h-5 w-5", pending && "animate-spin")} />
          </div>
          <div>
            <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
              Institutional Market Scanner
              <Badge variant="outline" className="text-[10px] font-mono font-medium">
                {settings.traderProfile.replaceAll("_", " ")}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Algorithmic setup screener enforcing minimum {settings.minRiskReward}R and macro news clearance.
            </CardDescription>
          </div>
        </div>

        <Button
          size="sm"
          disabled={pending || !isLoaded}
          onClick={scan}
          className="text-xs font-semibold gap-1.5 shadow-sm"
        >
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Scanning Markets...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Scan Verified Markets
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Automation Toggle Banner */}
        <div className="flex items-start gap-3 rounded-xl bg-muted/40 border border-border p-3 text-xs">
          <input
            type="checkbox"
            id="automation-checkbox"
            checked={settings.automationEnabled}
            disabled={pending || !isLoaded}
            onChange={(event) => {
              const enabled = event.target.checked;
              startTransition(async () => {
                await updateSettings({
                  ...settings,
                  automationEnabled: enabled,
                });
                toast.success(
                  enabled
                    ? "Headless automation enabled for your account."
                    : "Headless automation paused.",
                );
              });
            }}
            className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
          />
          <label htmlFor="automation-checkbox" className="cursor-pointer select-none space-y-0.5">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Autonomous Background Scanning & Entry Execution
            </span>
            <p className="text-muted-foreground leading-relaxed">
              When enabled, verified opportunities are continuously monitored and logged during your active trading sessions. Strict risk rules and news blackout blackouts are always enforced.
            </p>
          </label>
        </div>

        {/* Scan Results */}
        {scanned && opportunities.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            No qualifying setups found matching your current risk parameters and session focus.
          </div>
        )}

        {opportunities.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Scanned Candidates ({opportunities.length})
            </p>
            {opportunities.map((opportunity) => {
              const decimals =
                INSTRUMENTS.find((value) => value.symbol === opportunity.symbol)
                  ?.decimals ?? 5;
              const isLong = opportunity.direction === "LONG";

              return (
                <div
                  key={opportunity.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card/60 hover:bg-card/90 p-3.5 text-xs transition-all shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg shrink-0",
                        isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                      )}
                    >
                      {isLong ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm tracking-tight">
                          {opportunity.symbol}
                        </span>
                        <Badge
                          variant={isLong ? "success" : "destructive"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {opportunity.direction}
                        </Badge>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-semibold text-foreground">
                          RR 1:{opportunity.riskReward.toFixed(1)}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                        Zone: {formatPrice(opportunity.entryMin, decimals)} - {formatPrice(opportunity.entryMax, decimals)} · SL: {formatPrice(opportunity.stopLoss, decimals)}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => approve(opportunity)}
                    className="text-xs font-semibold gap-1.5 self-end sm:self-center shrink-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Review & Save
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
