import { Calendar } from "lucide-react";
import { getEconomicEvents } from "@/lib/services/calendar";
import { CalendarConsole } from "@/components/calendar/CalendarConsole";

export default async function CalendarPage() {
  const events = await getEconomicEvents();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Macroeconomic Calendar & Volatility Radar
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track high-impact news catalysts, respect no-trade release windows, and monitor currency events in PHT.
          </p>
        </div>
      </div>

      <CalendarConsole events={events} />
    </div>
  );
}
