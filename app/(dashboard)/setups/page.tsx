import { getActiveSetups } from "@/lib/services/setups";
import { SetupGrid } from "@/components/setups/SetupGrid";

export default async function SetupsPage() {
  const setups = await getActiveSetups();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Active Setups</h2>
        <p className="text-sm text-muted-foreground">
          Trades waiting for entry confirmation or currently active in the market.
        </p>
      </div>
      <SetupGrid setups={setups} />
    </div>
  );
}
