"use client";

import { useState, useMemo } from "react";
import { Grid, Info } from "lucide-react";
import type { PriceQuote } from "@/types/market";
import { buildCorrelationMatrix, type CorrelationCell } from "@/lib/correlationUtils";
import { cn } from "@/lib/utils";

interface CorrelationHeatmapProps {
  quotes: PriceQuote[];
}

export function CorrelationHeatmap({ quotes }: CorrelationHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<CorrelationCell | null>(null);

  const { symbols, matrix } = useMemo(() => {
    return buildCorrelationMatrix(quotes);
  }, [quotes]);

  const getCellBg = (coeff: number) => {
    if (coeff >= 0.7) return "bg-emerald-500/30 text-emerald-500 font-bold";
    if (coeff >= 0.3) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    if (coeff > -0.3) return "bg-muted/40 text-muted-foreground";
    if (coeff > -0.7) return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
    return "bg-rose-500/30 text-rose-500 font-bold";
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Grid className="h-4 w-4 text-primary" />
            Cross-Asset Correlation Matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Statistical Pearson correlation (-1.00 to +1.00) across intraday price series.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-emerald-500/30 border border-emerald-500/50" />
            +0.7+ Pos
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-muted border border-border" />
            0.0 Neutral
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-rose-500/30 border border-rose-500/50" />
            -0.7- Inv
          </span>
        </div>
      </div>

      {/* Selected Cell Advice Callout */}
      {selectedCell && (
        <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-foreground">
                {selectedCell.symbolA} vs {selectedCell.symbolB} (r = {selectedCell.coefficient > 0 ? `+${selectedCell.coefficient}` : selectedCell.coefficient})
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {selectedCell.riskAdvice}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedCell(null)}
            className="text-[10px] text-muted-foreground hover:text-foreground underline shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {/* Correlation Table Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center text-xs font-mono">
          <thead>
            <tr>
              <th className="p-2 text-left font-semibold text-muted-foreground text-[11px]">
                Asset
              </th>
              {symbols.map((sym) => (
                <th key={sym} className="p-2 font-bold text-foreground text-[11px]">
                  {sym}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={symbols[i]} className="border-t border-border/40">
                <td className="p-2 text-left font-bold text-foreground text-[11px]">
                  {symbols[i]}
                </td>
                {row.map((cell) => {
                  const isSelected =
                    selectedCell?.symbolA === cell.symbolA && selectedCell?.symbolB === cell.symbolB;

                  return (
                    <td
                      key={`${cell.symbolA}-${cell.symbolB}`}
                      onClick={() => setSelectedCell(cell)}
                      className={cn(
                        "p-2 transition-all cursor-pointer select-none",
                        getCellBg(cell.coefficient),
                        isSelected && "ring-2 ring-primary ring-inset z-10"
                      )}
                      title={`${cell.symbolA} vs ${cell.symbolB}: ${cell.coefficient}`}
                    >
                      {cell.coefficient > 0 ? `+${cell.coefficient.toFixed(2)}` : cell.coefficient.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
