"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { toast } from "sonner";
import { 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  Sliders, 
  ShieldCheck, 
  PlusCircle,
  Zap,
  Timer
} from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { runMarketScanAction, commitScannedSetupAction } from "@/app/actions/scannerActions";
import type { ScannedOpportunity, ScannerFilterConfig } from "@/types/scanner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function MarketScannerWidget() {
  const [isScanning, startScan] = useTransition();
  const [opportunities, setOpportunities] = useState<ScannedOpportunity[]>([]);
  const [committedIds, setCommittedIds] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const isPollingRef = useRef<boolean>(false);

  const [config, setConfig] = useState<ScannerFilterConfig>({
    minConfluenceScore: 75,
    minRiskReward: 2.0,
    enableNewsFilter: true,
    autoCommit: false,
    pollingIntervalMinutes: 0, // 0 = Manual on-demand
  });

  const executeScan = (silent = false) => {
    startScan(async () => {
      const res = await runMarketScanAction(config);
      setHasScanned(true);

      if (res.success && res.result) {
        setOpportunities(res.result.opportunities);
        if (config.autoCommit && res.result.committedCount > 0) {
          toast.success(`⚡ Auto-Committed ${res.result.committedCount} Setup(s) to Supabase!`, {
            description: "Active in WAITING_FOR_CONFIRMATION status.",
          });
        } else if (res.result.opportunities.length > 0) {
          if (!silent) {
            toast.info(`Found ${res.result.opportunities.length} High-Confluence Setup(s)`, {
              description: "Review parameters below and click Approve to log.",
            });
          }
        } else if (!silent) {
          toast.warning("No Setups Met Confluence Criteria", {
            description: "Markets may be in mixed consolidation or constrained by news risk.",
          });
        }
      } else if (!silent) {
        toast.error(res.error ?? "Market scanner failed.");
      }
    });
  };

  // Background Live Polling Timer
  useEffect(() => {
    if (config.pollingIntervalMinutes <= 0) return;

    const intervalMs = config.pollingIntervalMinutes * 60 * 1000;
    const timerId = setInterval(() => {
      if (!isPollingRef.current) {
        isPollingRef.current = true;
        executeScan(true);
        setTimeout(() => {
          isPollingRef.current = false;
        }, 5000);
      }
    }, intervalMs);

    return () => clearInterval(timerId);
  }, [config]);

  const handleCommitSingle = async (opp: ScannedOpportunity) => {
    toast.loading(`Logging setup for ${opp.symbol}...`, { id: opp.id });
    const res = await commitScannedSetupAction(opp);
    if (res.success) {
      setCommittedIds((prev) => [...prev, opp.id]);
      toast.success(`Setup for ${opp.symbol} Logged Successfully!`, {
        id: opp.id,
        description: `Entry zone [${opp.entryMin} - ${opp.entryMax}] is now monitored.`,
      });
    } else {
      toast.error(`Failed to log setup: ${res.error}`, { id: opp.id });
    }
  };

  return (
    <Card className="glass border-border/80 shadow-md">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-sky-500 animate-pulse" />
            <CardTitle className="text-base font-semibold tracking-tight">
              Automated Strategy Scanner
            </CardTitle>
            <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[10px] font-mono">
              MTF Trend Pullback Engine
            </Badge>
            {config.pollingIntervalMinutes > 0 && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-mono flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Live {config.pollingIntervalMinutes}m
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Evaluates multi-timeframe EMA alignment, RSI pullbacks, daily pivots, and news hazards to discover trades.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowConfig((prev) => !prev)}
            className="h-8 text-xs gap-1.5"
          >
            <Sliders className="h-3.5 w-3.5" />
            Parameters
          </Button>
          <Button
            size="sm"
            onClick={() => executeScan(false)}
            disabled={isScanning}
            className="h-8 text-xs gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
            {isScanning ? "Scanning Markets..." : "Scan Market Now"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter Configuration Drawer */}
        {showConfig && (
          <div className="rounded-lg border border-border bg-muted/40 p-3.5 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs animate-in fade-in-50 duration-200">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Min Confluence ({config.minConfluenceScore}%)
              </label>
              <input
                type="range"
                min="60"
                max="90"
                step="5"
                value={config.minConfluenceScore}
                onChange={(e) => setConfig({ ...config, minConfluenceScore: Number(e.target.value) })}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Min Risk:Reward (1:{config.minRiskReward.toFixed(1)})
              </label>
              <input
                type="range"
                min="1.5"
                max="4.0"
                step="0.5"
                value={config.minRiskReward}
                onChange={(e) => setConfig({ ...config, minRiskReward: Number(e.target.value) })}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Live Polling
              </label>
              <select
                value={config.pollingIntervalMinutes}
                onChange={(e) => setConfig({ ...config, pollingIntervalMinutes: Number(e.target.value) })}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
              >
                <option value={0}>Manual Only</option>
                <option value={5}>Every 5 mins</option>
                <option value={15}>Every 15 mins</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-3">
              <input
                type="checkbox"
                id="newsFilter"
                checked={config.enableNewsFilter}
                onChange={(e) => setConfig({ ...config, enableNewsFilter: e.target.checked })}
                className="rounded border-border text-sky-500 focus:ring-sky-500 h-4 w-4"
              />
              <label htmlFor="newsFilter" className="font-medium text-foreground cursor-pointer">
                News Risk Filter
              </label>
            </div>

            <div className="flex items-center gap-2 pt-3">
              <input
                type="checkbox"
                id="autoCommit"
                checked={config.autoCommit}
                onChange={(e) => setConfig({ ...config, autoCommit: e.target.checked })}
                className="rounded border-border text-sky-500 focus:ring-sky-500 h-4 w-4"
              />
              <label htmlFor="autoCommit" className="font-medium text-foreground cursor-pointer flex items-center gap-1">
                Auto-Commit <Zap className="h-3 w-3 text-amber-500" />
              </label>
            </div>
          </div>
        )}

        {/* Opportunities Review Queue */}
        {opportunities.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Discovered {opportunities.length} Qualified Setup(s)</span>
              <span className="flex items-center gap-1 text-emerald-500 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" /> High-Impact News Filter Passed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {opportunities.map((opp) => {
                const isCommitted = committedIds.includes(opp.id);
                const instrument = INSTRUMENTS.find((i) => i.symbol === opp.symbol);
                const decimals = instrument?.decimals ?? 5;

                return (
                  <div
                    key={opp.id}
                    className="rounded-lg border border-border bg-card/60 p-3.5 space-y-3 relative overflow-hidden transition-all hover:border-sky-500/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm tracking-tight">{opp.symbol}</span>
                        <Badge
                          variant="outline"
                          className={
                            opp.direction === "LONG"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          }
                        >
                          {opp.direction === "LONG" ? (
                            <ArrowUpRight className="h-3 w-3 mr-0.5 inline" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 mr-0.5 inline" />
                          )}
                          {opp.direction}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-muted-foreground">R:R</span>
                        <span className="font-semibold text-emerald-400">1:{opp.riskReward}</span>
                      </div>
                    </div>

                    {/* Price Corridor Parameters */}
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-muted/30 rounded p-2 border border-border/50">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">ENTRY ZONE</span>
                        <span className="font-medium text-foreground">
                          {formatPrice(opp.entryMin, decimals)} - {formatPrice(opp.entryMax, decimals)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">STOP LOSS</span>
                        <span className="font-medium text-rose-400">
                          {formatPrice(opp.stopLoss, decimals)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">TAKE PROFIT</span>
                        <span className="font-medium text-emerald-400">
                          {formatPrice(opp.takeProfit1, decimals)}
                        </span>
                      </div>
                    </div>

                    {/* Confluence Tags */}
                    <div className="flex flex-wrap gap-1">
                      {opp.confluenceTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-secondary/80 text-secondary-foreground px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Action Button */}
                    <div className="pt-1 flex justify-end">
                      {isCommitted ? (
                        <Button size="sm" disabled variant="outline" className="h-7 text-xs gap-1 text-emerald-500 border-emerald-500/30">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Committed to Setups
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleCommitSingle(opp)}
                          className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Approve & Commit Setup
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : hasScanned && !isScanning ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground space-y-1">
            <Sparkles className="h-5 w-5 mx-auto text-muted-foreground/60 mb-2" />
            <p className="font-medium text-foreground">No High-Probability Setups Detected</p>
            <p>All currency pairs either have news hazards or do not currently satisfy your {config.minConfluenceScore}% confluence threshold.</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
