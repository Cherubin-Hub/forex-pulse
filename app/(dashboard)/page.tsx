import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { getQuotes } from "@/lib/services/marketData";
import { getEconomicEvents } from "@/lib/services/calendar";
import { getActiveSetups } from "@/lib/services/setups";
import { getLatestReport } from "@/lib/services/reports";
import { ExecutiveBriefingBar } from "@/components/dashboard/ExecutiveBriefingBar";
import { MarketMoversStrip } from "@/components/dashboard/MarketMoversStrip";
import { LatestReportWidget } from "@/components/dashboard/LatestReportWidget";
import { SessionBar } from "@/components/sessions/SessionBar";
import { CurrencyCardGrid, type CurrencyCardItem } from "@/components/market/CurrencyCardGrid";
import { SetupGrid } from "@/components/setups/SetupGrid";
import { UpcomingEventsPanel } from "@/components/calendar/UpcomingEventsPanel";

export default async function DashboardPage() {
  const [quotes, events, setups, latestReport] = await Promise.all([
    getQuotes(),
    getEconomicEvents(),
    getActiveSetups(),
    getLatestReport(),
  ]);

  const items: CurrencyCardItem[] = INSTRUMENTS.map((instrument) => ({
    instrument,
    quote: quotes.find((quote) => quote.symbol === instrument.symbol) ?? null,
  }));

  return (
    <div className="space-y-6 max-w-6xl">
      {/* 1. Executive Briefing Bar */}
      <ExecutiveBriefingBar activeSetups={setups} events={events} />

      {/* 2. Global Market Session Bar */}
      <SessionBar />

      {/* 3. Market Movers & USD Macro Bias Strip */}
      <MarketMoversStrip quotes={quotes} />

      {/* 4. Active Setups Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Active Trade Setups</h2>
            <p className="text-xs text-muted-foreground">Trades awaiting entry confirmation or actively running.</p>
          </div>
          <Link href="/setups" className="flex items-center text-xs font-semibold text-primary hover:underline gap-1">
            View All Setups ({setups.length}) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <SetupGrid setups={setups.slice(0, 3)} />
      </section>

      {/* 5. Two-Column Intelligence Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left Column: Watchlist Overview */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Watchlist Overview</h2>
              <p className="text-xs text-muted-foreground">Current prices, 24h change, and sparkline trends.</p>
            </div>
            <Link href="/markets" className="text-xs font-semibold text-primary hover:underline">
              Markets Hub →
            </Link>
          </div>
          <CurrencyCardGrid items={items} />
        </section>

        {/* Right Column: Macro Catalysts & Latest Report Dispatch */}
        <div className="space-y-6">
          <LatestReportWidget report={latestReport} />
          <UpcomingEventsPanel events={events} />
        </div>
      </div>
    </div>
  );
}
