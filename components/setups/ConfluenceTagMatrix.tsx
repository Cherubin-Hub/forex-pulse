"use client";

import { useState, useMemo } from "react";
import { Award, Target, Tag } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { calculateTagAnalytics, calculateDimensionAnalytics } from "@/lib/analyticsUtils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfluenceTagMatrixProps {
  setups: TradingSetup[];
  onSelectTag: (tag: string) => void;
  activeTag: string;
}

type MatrixTab = "TAGS" | "DIRECTION" | "PAIRS";

export function ConfluenceTagMatrix({ setups, onSelectTag, activeTag }: ConfluenceTagMatrixProps) {
  const [tab, setTab] = useState<MatrixTab>("TAGS");

  const tagData = useMemo(() => calculateTagAnalytics(setups), [setups]);
  const directionData = useMemo(() => calculateDimensionAnalytics(setups, "DIRECTION"), [setups]);
  const pairData = useMemo(() => calculateDimensionAnalytics(setups, "SYMBOL"), [setups]);

  if (setups.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Playbook Edge & Confluence Matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Statistical edge, win rates, and R-expectancy across your execution playbook.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
          <Button
            variant={tab === "TAGS" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs font-semibold"
            onClick={() => setTab("TAGS")}
          >
            Confluences
          </Button>
          <Button
            variant={tab === "DIRECTION" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs font-semibold"
            onClick={() => setTab("DIRECTION")}
          >
            Direction
          </Button>
          <Button
            variant={tab === "PAIRS" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs font-semibold"
            onClick={() => setTab("PAIRS")}
          >
            Pairs
          </Button>
        </div>
      </div>

      {/* View: Confluence Tags Table */}
      {tab === "TAGS" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-[11px] text-muted-foreground">
                <th className="pb-2 font-medium">Confluence Tag</th>
                <th className="pb-2 font-medium text-center">Record</th>
                <th className="pb-2 font-medium text-center">Win Rate</th>
                <th className="pb-2 font-medium text-center">Net R</th>
                <th className="pb-2 font-medium text-center">Expectancy</th>
                <th className="pb-2 font-medium text-right">Edge Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tagData.map((row) => {
                const isSelected = activeTag.toLowerCase() === row.tag.toLowerCase();
                const isConfirmed = row.winRate >= 55 && row.netR > 0;

                return (
                  <tr
                    key={row.tag}
                    onClick={() => onSelectTag(isSelected ? "" : row.tag)}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-muted/30",
                      isSelected && "bg-primary/10"
                    )}
                  >
                    <td className="py-2.5 font-semibold flex items-center gap-1.5">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <span>{row.tag}</span>
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </td>
                    <td className="py-2.5 text-center font-mono text-muted-foreground">
                      {row.wins}W - {row.losses}L
                    </td>
                    <td className="py-2.5 text-center font-mono font-bold">
                      <span className={row.winRate >= 50 ? "text-emerald-500" : "text-rose-500"}>
                        {row.winRate}%
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-mono font-bold">
                      <span className={row.netR >= 0 ? "text-emerald-500" : "text-rose-500"}>
                        {row.netR > 0 ? `+${row.netR}R` : `${row.netR}R`}
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-mono">
                      {row.expectancyR > 0 ? `+${row.expectancyR}R` : `${row.expectancyR}R`}
                    </td>
                    <td className="py-2.5 text-right">
                      {isConfirmed ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 border border-emerald-500/20">
                          <Award className="h-3 w-3" />
                          Edge Confirmed
                        </span>
                      ) : (
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Gathering Data
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View: Directional Long vs Short */}
      {tab === "DIRECTION" && (
        <div className="grid grid-cols-2 gap-3">
          {directionData.map((d) => (
            <div
              key={d.key}
              className={cn(
                "rounded-lg border p-3 text-xs space-y-2",
                d.key === "LONG" ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"
              )}
            >
              <div className="flex items-center justify-between font-bold">
                <span className={d.key === "LONG" ? "text-emerald-500" : "text-rose-500"}>
                  {d.key} Trades
                </span>
                <span className="font-mono text-xs">{d.wins}W - {d.losses}L</span>
              </div>
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-muted-foreground">Win Rate:</span>
                <span className="font-bold">{d.winRate}%</span>
              </div>
              <div className="flex items-baseline justify-between font-mono border-t border-border/40 pt-1.5">
                <span className="text-muted-foreground">Net Return:</span>
                <span className={cn("font-bold", d.netR >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {d.netR > 0 ? `+${d.netR}R` : `${d.netR}R`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View: Pair Performance */}
      {tab === "PAIRS" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {pairData.map((p) => (
            <div key={p.key} className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>{p.key}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{p.totalTrades} trades</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">Win:</span>
                <span className={p.winRate >= 50 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                  {p.winRate}%
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">Net R:</span>
                <span className={cn("font-bold", p.netR >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {p.netR > 0 ? `+${p.netR}R` : `${p.netR}R`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
