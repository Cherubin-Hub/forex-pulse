import { getEconomicEvents } from "@/lib/services/calendar";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";

export default async function CalendarPage() {
  const events = await getEconomicEvents();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">This Week</h2>
        <p className="text-sm text-muted-foreground">
          All times in PHT. High-impact rows are highlighted based on your News Sensitivity setting.
        </p>
      </div>
      <CalendarWeekView events={events} />
    </div>
  );
}
