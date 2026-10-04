import type { DataStatus } from "@/types/market";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<DataStatus, { label: string; dot: string; text: string; pulse: boolean }> = {
  LIVE: { label: "Live", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", pulse: true },
  DELAYED: { label: "Delayed", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", pulse: false },
  MOCK: { label: "Mock", dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-400", pulse: false },
  UNAVAILABLE: { label: "Unavailable", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", pulse: false },
};

export function DataStatusBadge({ status, delayMinutes }: { status: DataStatus; delayMinutes: number }) {
  const config = STATUS_CONFIG[status];
  const label = status === "DELAYED" ? `Delayed ${delayMinutes}m` : config.label;

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", config.text)}>
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", config.dot)} />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", config.dot)} />
      </span>
      {label}
    </span>
  );
}
