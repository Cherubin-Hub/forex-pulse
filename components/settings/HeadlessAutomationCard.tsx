"use client";

import { useState } from "react";
import { Server, Play, CheckCircle2, Clock, Cpu } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { triggerHeadlessCycleAction } from "@/app/actions/scannerActions";

interface CycleResponse {
  success: boolean;
  timestamp: string;
  scannedSymbols: number;
  opportunitiesFound: number;
  setupsCreated: number;
  setupsUpdated: number;
  activeUsersCount: number;
  durationMs: number;
  error?: string;
}

export function HeadlessAutomationCard() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<CycleResponse | null>(null);

  const handleTriggerCycle = async () => {
    setIsRunning(true);
    try {
      const data = await triggerHeadlessCycleAction();
      setLastResult(data);

      if (data.success) {
        toast.success("24/7 Automation Cycle Executed", {
          description: `Scanned ${data.scannedSymbols} pairs. Found ${data.opportunitiesFound} setups. Committed ${data.setupsCreated} signals. Resolved ${data.setupsUpdated} setups (${data.durationMs}ms).`,
        });
      } else {
        toast.error("Headless Cycle Failed", { description: data.error });
      }
    } catch (err) {
      toast.error("Execution Error", {
        description: err instanceof Error ? err.message : "Failed to trigger scan.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                24/7 Headless Server Automation
              </CardTitle>
              <CardDescription className="text-xs">
                Autonomous background market scanning, offline trade execution, and signal dispatch.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-mono text-[11px] gap-1.5 py-1 px-2.5"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Daemon Active (90s Loop)
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              <span>Offline Market Scanner</span>
            </div>
            <p className="text-sm font-semibold text-foreground">Continuous MTF Scan</p>
            <p className="text-[11px] text-muted-foreground">
              Evaluates D1, H4, H1, M15 trends and commits setups even when logged off.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Auto-Resolution Engine</span>
            </div>
            <p className="text-sm font-semibold text-foreground">TP & SL Protection</p>
            <p className="text-[11px] text-muted-foreground">
              Monitors active positions against live ticks to lock wins and cap losses 24/7.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Cron Webhook Endpoint</span>
            </div>
            <p className="text-xs font-mono font-semibold text-foreground truncate">/api/cron/scan</p>
            <p className="text-[11px] text-muted-foreground">
              Can be pinged by Vercel Cron, GitHub Actions, or any cloud webhook scheduler.
            </p>
          </div>
        </div>

        {lastResult && (
          <div className="rounded-lg border border-border bg-card p-3 font-mono text-xs space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Last Execution: {new Date(lastResult.timestamp).toLocaleTimeString()}</span>
              <span className="text-foreground font-semibold">{lastResult.durationMs}ms</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-[11px]">
              <span>Symbols Scanned: <b className="text-foreground">{lastResult.scannedSymbols}</b></span>
              <span>Setups Found: <b className="text-foreground">{lastResult.opportunitiesFound}</b></span>
              <span>Signals Created: <b className="text-emerald-500">{lastResult.setupsCreated}</b></span>
              <span>Trades Resolved: <b className="text-primary">{lastResult.setupsUpdated}</b></span>
              <span>Active Accounts: <b className="text-foreground">{lastResult.activeUsersCount}</b></span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            The in-process daemon starts automatically when the Next.js server boots up.
          </p>
          <Button
            size="sm"
            onClick={handleTriggerCycle}
            disabled={isRunning}
            className="gap-1.5 text-xs h-8"
          >
            <Play className={`h-3 w-3 ${isRunning ? "animate-spin" : ""}`} />
            <span>{isRunning ? "Executing..." : "Test 24/7 Scan Cycle"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
