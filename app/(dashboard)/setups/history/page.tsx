import { History } from "lucide-react";
import { getHistorySetups } from "@/lib/services/setups";
import { SetupHistoryView } from "@/components/setups/SetupHistoryView";

export default async function SetupHistoryPage() {
  const setups = await getHistorySetups();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Setup History & Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track execution discipline, verified win rates, and R-multiple returns.
          </p>
        </div>
      </div>

      <SetupHistoryView initialSetups={setups} />
    </div>
  );
}
