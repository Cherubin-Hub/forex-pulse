import { getCalendarSnapshot } from "@/lib/services/calendar";
import { getActiveSetups } from "@/lib/services/setups";
import { getQuotes } from "@/lib/services/marketData";
import { SetupGrid } from "@/components/setups/SetupGrid";
import { CreateSetupModal } from "@/components/setups/CreateSetupModal";
import { SetupRealtimeListener } from "@/components/setups/SetupRealtimeListener";
import { SignalAutomationListener } from "@/components/setups/SignalAutomationListener";
import { AlertRulesPanel } from "@/components/setups/AlertRulesPanel";
import { MarketScannerWidget } from "@/components/setups/MarketScannerWidget";

export default async function SetupsPage() {
  const [setups, quotes, calendar] = await Promise.all([
    getActiveSetups(),
    getQuotes(),
    getCalendarSnapshot(),
  ]);

  return (
    <div className="space-y-6">
      {/* Realtime WebSocket subscription */}
      <SetupRealtimeListener />

      {/* Headless Signal & Automation Watcher */}
      <SignalAutomationListener quotes={quotes} setups={setups} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Active Setups</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Trades waiting for entry confirmation or currently active in the
            market.
          </p>
        </div>
        <CreateSetupModal
          events={calendar.events}
          activeSetups={setups}
          calendarAvailable={calendar.available}
        />
      </div>

      {/* Automated Strategy Scanner Engine */}
      <MarketScannerWidget />

      {/* Signal Automation & Custom Alerts Console */}
      <AlertRulesPanel setups={setups} />

      {/* Active Setups Grid */}
      <SetupGrid setups={setups} quotes={quotes} />
    </div>
  );
}
