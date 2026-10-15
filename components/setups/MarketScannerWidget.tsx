"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
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
  Hand
} from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { runMarketScanAction, commitScannedSetupAction } from "@/app/actions/scannerActions";
import type { ScannedOpportunity, ScannerFilterConfig } from "@/types/scanner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
    autoCommit: true,
    mode: "AUTOMATIC",
    scanIntervalSeconds: 15,
  });

  const executeScan = useCallback((silent = false) => {
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
  }, [config]);

  // Background Live Polling Timer when in AUTOMATIC mode
  useEffect(() => {
    if (config.mode !== "AUTOMATIC") return;

    const intervalMs = config.scanIntervalSeconds * 1000;
    const timerId = setInterval(() => {
      if (!isPollingRef.current) {
        isPollingRef.current = true;
        executeScan(true);
        setTimeout(() => {
          isPollingRef.current = false;
        }, 3000);
      }
    }, intervalMs);

    return () => clearInterval(timerId);
  }, [config.mode, config.scanIntervalSeconds, executeScan]);

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
            {config.mode === "AUTOMATIC" ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-mono flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Auto Continuous ({config.scanIntervalSeconds}s)
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] font-mono flex items-center gap-1">
                <Hand className="h-3 w-3" />
                Manual Mode
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
            {/* Mode Switch: Manual vs Automatic */}
            <div className="col-span-1 sm:col-span-2">
              <label className="font-semibold text-muted-foreground block mb-1.5">
                Scanner Execution Mode
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, mode: "MANUAL", autoCommit: false })}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition-all cursor-pointer",
                    config.mode === "MANUAL"
                      ? "bg-muted text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Hand className="h-3.5 w-3.5" />
                  Manual Mode
                </button>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, mode: "AUTOMATIC", autoCommit: true })}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition-all cursor-pointer",
                    config.mode === "AUTOMATIC"
                      ? "bg-sky-500 text-white font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Automatic Mode
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {config.mode === "AUTOMATIC"
                  ? `⚡ Continuous auto-scans every ${config.scanIntervalSeconds}s with direct Supabase logging.`
                  : "👆 On-demand scan only when you click 'Scan Market Now'."}
              </p>
            </div>

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

            <div className="flex flex-col justify-end space-y-2">
              <div className="flex items-center gap-2">
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

              <div className="flex items-center gap-2">
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
                    className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-md font-bold text-xs ${
                            opp.direction === "LONG"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-rose-500/10 text-rose-500"
                          }`}
                        >
                          {opp.direction === "LONG" ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                        </span>
                        <div>
                          <span className="font-bold text-sm text-foreground">{opp.symbol}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">
                            {opp.strategy}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-[10px] bg-primary/5 text-primary border-primary/20">
                          R:R 1:{opp.riskReward}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        >
                          {opp.confluenceScore}% Confluence
                        </Badge>
                      </div>
                    </div>

                    {/* Geometry Matrix */}
                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/30 p-2.5 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Entry Zone</span>
                        <span className="font-mono font-medium text-foreground">
                          {formatPrice(opp.entryMin, decimals)}
                        </span>
                        <span className="text-[9px] text-muted-foreground block font-mono">
                          {formatPrice(opp.entryMax, decimals)}
                        </span>
                      </div>
                      <div className="border-l border-border/60">
                        <span className="text-[10px] text-muted-foreground block">Stop Loss</span>
                        <span className="font-mono font-medium text-rose-500">
                          {formatPrice(opp.stopLoss, decimals)}
                        </span>
                      </div>
                      <div className="border-l border-border/60">
                        <span className="text-[10px] text-muted-foreground block">Take Profit 1</span>
                        <span className="font-mono font-medium text-emerald-500">
                          {formatPrice(opp.takeProfit1, decimals)}
                        </span>
                      </div>
                    </div>

                    {/* Confluence Tag Pills */}
                    <div className="flex flex-wrap gap-1">
                      {opp.confluenceTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[220px]" title={opp.invalidationRule}>
                        {opp.invalidationRule}
                      </span>

                      {isCommitted ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 font-mono">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Logged to Radar
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleCommitSingle(opp)}
                          className="h-7 text-xs gap-1 bg-primary text-primary-foreground font-semibold"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Approve Setup
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : hasScanned ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No opportunities met your minimum confluence ({config.minConfluenceScore}%) or R:R (1:{config.minRiskReward}) thresholds on this cycle.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
