"use client";

import { useState, useEffect } from "react";
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Sparkles, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HealthData = {
  success: boolean;
  status: "CONNECTED" | "OFFLINE";
  latencyMs: number;
  counts?: Record<string, number>;
  error?: string;
};

export function DatabaseSeedCard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchHealth = async () => {
    setIsChecking(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/seed");
      const data: HealthData = await res.json();
      setHealth(data);
    } catch {
      setHealth({ success: false, status: "OFFLINE", latencyMs: 0, error: "Network error fetching health." });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleSeed = async () => {
    if (!confirm("This will synchronize and seed institutional datasets across all Supabase tables. Proceed?")) return;

    setIsSeeding(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: "success", text: data.message });
        await fetchHealth();
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to seed database." });
      }
    } catch (err) {
      setActionMessage({ type: "error", text: err instanceof Error ? err.message : "Network error during seeding." });
    } finally {
      setIsSeeding(false);
    }
  };

  const isConnected = health?.status === "CONNECTED";

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Supabase Cloud & Data Seeding Engine
          </h3>
          <p className="text-xs text-muted-foreground">
            Verify cloud connectivity, audit table record counts, and synchronize institutional datasets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              isConnected
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
            )}
          >
            {isConnected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {isConnected ? `Connected (${health?.latencyMs}ms)` : "Offline (Mock Fallback)"}
          </span>
        </div>
      </div>

      {/* Row Counts Matrix */}
      {health?.counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {Object.entries(health.counts).map(([table, count]) => (
            <div key={table} className="rounded-lg border border-border/70 bg-muted/20 p-2.5 text-center">
              <span className="text-[10px] text-muted-foreground font-mono block truncate" title={table}>
                {table.replace(/_/g, " ")}
              </span>
              <span className="text-sm font-bold font-mono text-foreground mt-0.5 block">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Status Alert Message */}
      {actionMessage && (
        <div
          className={cn(
            "rounded-lg p-3 text-xs font-medium border",
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
              : "bg-rose-500/10 border-rose-500/30 text-rose-500"
          )}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span>Controllers automatically fall back to local mock data when offline.</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealth}
            disabled={isChecking || isSeeding}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isChecking && "animate-spin")} />
            Audit Health
          </Button>

          <Button
            size="sm"
            onClick={handleSeed}
            disabled={isSeeding || isChecking}
            className="text-xs h-8 gap-1.5"
          >
            <Sparkles className={cn("h-3.5 w-3.5", isSeeding && "animate-spin")} />
            {isSeeding ? "Seeding Database..." : "Seed Institutional Dataset"}
          </Button>
        </div>
      </div>
    </div>
  );
}
