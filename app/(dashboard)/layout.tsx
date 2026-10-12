import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LiveStreamingTickerTape } from "@/components/market/LiveStreamingTickerTape";
import { CircuitBreakerBanner } from "@/components/layout/CircuitBreakerBanner";
import { KeyboardShortcutsProvider } from "@/components/providers/KeyboardShortcutsProvider";
import { getQuotes } from "@/lib/services/marketData";
import { getEconomicEvents } from "@/lib/services/calendar";
import { getActiveSetups, getHistorySetups } from "@/lib/services/setups";
import { getNotifications } from "@/lib/services/notifications";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [quotes, events, activeSetups, historySetups, notifications] = await Promise.all([
    getQuotes(),
    getEconomicEvents(),
    getActiveSetups(),
    getHistorySetups(),
    getNotifications(),
  ]);

  const allSetups = [...activeSetups, ...historySetups];

  return (
    <KeyboardShortcutsProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            notifications={notifications}
            events={events}
            setups={activeSetups}
          />
          <LiveStreamingTickerTape initialQuotes={quotes} />
          <CircuitBreakerBanner setups={allSetups} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </KeyboardShortcutsProvider>
  );
}
