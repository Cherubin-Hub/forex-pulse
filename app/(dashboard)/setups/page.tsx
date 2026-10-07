import { getActiveSetups } from "@/lib/services/setups";
import { SetupGrid } from "@/components/setups/SetupGrid";
import { CreateSetupModal } from "@/components/setups/CreateSetupModal";

export default async function SetupsPage() {
  const setups = await getActiveSetups();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Active Setups</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Trades waiting for entry confirmation or currently active in the market.
          </p>
        </div>
        <CreateSetupModal />
      </div>

      <SetupGrid setups={setups} />
    </div>
  );
}
