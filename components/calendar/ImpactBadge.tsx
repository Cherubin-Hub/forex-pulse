import type { EventImpact } from "@/types/calendar";
import { cn } from "@/lib/utils";

const IMPACT_CONFIG: Record<EventImpact, { label: string; bars: number; color: string; text: string }> = {
  HIGH: { label: "High", bars: 3, color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  MEDIUM: { label: "Medium", bars: 2, color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  LOW: { label: "Low", bars: 1, color: "bg-slate-400", text: "text-muted-foreground" },
};

export function ImpactBadge({ impact, showLabel = false }: { impact: EventImpact; showLabel?: boolean }) {
  const config = IMPACT_CONFIG[impact];

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", config.text)} title={`${config.label} impact`}>
      <span className="flex items-end gap-0.5">
        {[1, 2, 3].map((level) => (
          <span
            key={level}
            className={cn("w-1 rounded-sm", level <= config.bars ? config.color : "bg-muted")}
            style={{ height: `${4 + level * 3}px` }}
          />
        ))}
      </span>
      {showLabel && config.label}
    </span>
  );
}
