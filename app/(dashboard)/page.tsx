import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { getQuotes } from "@/lib/services/marketData";
import { getEconomicEvents } from "@/lib/services/calendar";
import { getActiveSetups } from "@/lib/services/setups";
import { CurrencyCardGrid, type CurrencyCardItem } from "@/components/market/CurrencyCardGrid";
import { SessionBar } from "@/components/sessions/SessionBar";
import { NewsRiskBanner } from "@/components/calendar/NewsRiskBanner";
import { UpcomingEventsPanel } from "@/components/calendar/UpcomingEventsPanel";
import { SetupGrid } from "@/components/setups/SetupGrid";

export default async function DashboardPage() {
  const [quotes, events, setups] = await Promise.all([
    getQuotes(), 
    getEconomicEvents(),
    getActiveSetups()
  ]);

  const items: CurrencyCardItem[] = INSTRUMENTS.map((instrument) => ({
    instrument,
    quote: quotes.find((quote) => quote.symbol === instrument.symbol) ?? null,
  }));

  return (
    <div className="space-y-6">
      <NewsRiskBanner events={events} />

      <SessionBar />

      {/* Mini-version of Active Setups */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Active Setups</h2>
            <p className="text-sm text-muted-foreground">Trades waiting for entry or currently active.</p>
          </div>
          <Link href="/setups" className="flex items-center text-sm font-medium text-primary hover:underline">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <SetupGrid setups={setups.slice(0, 3)} />
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold tracking-tight">Market Overview</h2>
          <p className="text-sm text-muted-foreground">Majors and gold — current price, daily change and bias.</p>
        </div>
        <CurrencyCardGrid items={items} />
      </section>

      <UpcomingEventsPanel events={events} />
    </div>
  );
}
