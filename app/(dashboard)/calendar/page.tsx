import { Calendar } from "lucide-react";
import { getCalendarSnapshot } from "@/lib/services/calendar";
import { CalendarConsole } from "@/components/calendar/CalendarConsole";

export default async function CalendarPage() {
  const { events, available } = await getCalendarSnapshot();

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Macroeconomic Calendar & Volatility Radar
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track high-impact news catalysts, respect no-trade release windows,
            and monitor currency events in PHT.
          </p>
        </div>
      </div>

      {!available && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/30 p-3 text-sm text-amber-500"
        >
          Verified calendar coverage is unavailable or stale. New trading
          entries are paused.
        </p>
      )}
      <CalendarConsole events={events} available={available} />
    </div>
  );
}
