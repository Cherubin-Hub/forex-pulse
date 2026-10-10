"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Target } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import { calculateCumulativeRCurve } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

interface CumulativeRChartProps {
  setups: TradingSetup[];
}

export function CumulativeRChart({ setups }: CumulativeRChartProps) {
  const points = useMemo(() => calculateCumulativeRCurve(setups), [setups]);

  if (points.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-xs text-muted-foreground">
        <Target className="h-6 w-6 opacity-30 mb-2" />
        <p className="font-medium">Insufficient performance data.</p>
        <p className="text-[11px] mt-0.5">Resolve at least 2 trade setups to render your cumulative R curve.</p>
      </div>
    );
  }

  const values = points.map((p) => p.cumulativeR);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(1, ...values);
  const range = maxVal - minVal || 1;

  const width = 600;
  const height = 140;
  const paddingX = 16;
  const paddingY = 16;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Zero baseline Y position
  const zeroY = paddingY + chartHeight - ((0 - minVal) / range) * chartHeight;

  // Compute SVG point coordinates
  const svgCoords = points.map((pt, i) => {
    const x = paddingX + (i / (points.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - ((pt.cumulativeR - minVal) / range) * chartHeight;
    return { x, y, pt };
  });

  const linePath = `M ${svgCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" L ")}`;
  const finalR = points[points.length - 1]?.cumulativeR ?? 0;
  const isPositive = finalR >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            )}
            Cumulative R-Multiple Curve
          </h3>
          <p className="text-xs text-muted-foreground">
            Risk-adjusted account growth across {points.length} closed trade setups.
          </p>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "text-lg font-bold font-mono",
              isPositive ? "text-emerald-500" : "text-rose-500"
            )}
          >
            {finalR > 0 ? `+${finalR}R` : `${finalR}R`}
          </span>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Net Realized</p>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-36 overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Zero baseline */}
          <line
            x1={paddingX}
            y1={zeroY}
            x2={width - paddingX}
            y2={zeroY}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-border"
            strokeWidth={1}
          />

          {/* Performance Line */}
          <path
            d={linePath}
            fill="none"
            stroke={isPositive ? "#10b981" : "#f43f5e"}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots on each trade */}
          {svgCoords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={3}
              className={isPositive ? "fill-emerald-500" : "fill-rose-500"}
            />
          ))}
        </svg>
      </div>

      {/* Trade Sequence Milestones */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
        <span>Trade #1 ({points[0]?.date})</span>
        <span>Latest: Trade #{points.length} ({points[points.length - 1]?.date})</span>
      </div>
    </div>
  );
}
