import { isDemoMode } from "@/lib/marketQuality";
import { getAuthenticatedUser } from "@/lib/auth/user";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LiveStreamingTickerTape } from "@/components/market/LiveStreamingTickerTape";
import { CircuitBreakerBanner } from "@/components/layout/CircuitBreakerBanner";
import { KeyboardShortcutsProvider } from "@/components/providers/KeyboardShortcutsProvider";
import { AutoTradeAutomationProvider } from "@/components/providers/AutoTradeAutomationProvider";
import { getQuotes } from "@/lib/services/marketData";
import { getEconomicEvents } from "@/lib/services/calendar";
import { getActiveSetups, getHistorySetups } from "@/lib/services/setups";
import { getNotifications } from "@/lib/services/notifications";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [quotes, events, activeSetups, historySetups, notifications] =
    await Promise.all([
      getQuotes(),
      getEconomicEvents(),
      getActiveSetups(),
      getHistorySetups(),
      getNotifications(),
    ]);

  const user = await getAuthenticatedUser();
  const allSetups = [...activeSetups, ...historySetups];

  return (
    <KeyboardShortcutsProvider>
      <AutoTradeAutomationProvider
        initialQuotes={quotes}
        activeSetups={activeSetups}
      >
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header
              email={user?.email}
              notifications={notifications}
              events={events}
              setups={activeSetups}
            />
            {isDemoMode() && (
              <p
                role="status"
                className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-sm text-amber-500"
              >
                Demo mode: sample data. Saved trading and automation are
                disabled.
              </p>
            )}
            <LiveStreamingTickerTape initialQuotes={quotes} />
            <CircuitBreakerBanner setups={allSetups} />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </AutoTradeAutomationProvider>
    </KeyboardShortcutsProvider>
  );
}
