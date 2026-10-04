import { getHistorySetups } from "@/lib/services/setups";
import { SetupGrid } from "@/components/setups/SetupGrid";

export default async function SetupHistoryPage() {
  const setups = await getHistorySetups();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Setup History</h2>
        <p className="text-sm text-muted-foreground">
          Past setups, wins, losses, and invalidations.
        </p>
      </div>
      <SetupGrid setups={setups} />
    </div>
  );
}
