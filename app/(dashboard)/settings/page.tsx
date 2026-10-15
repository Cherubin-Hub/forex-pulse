import { SettingsForm } from "@/components/settings/SettingsForm";
import { DatabaseSeedCard } from "@/components/settings/DatabaseSeedCard";
import { FinnhubApiKeyCard } from "@/components/settings/FinnhubApiKeyCard";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Preferences & System Settings</h2>
        <p className="text-sm text-muted-foreground">
          Personalize analysis, execution rules, and manage cloud database synchronization.
        </p>
      </div>

      {/* Live Market Data Feed Configuration */}
      <FinnhubApiKeyCard />

      {/* Trader Profile & Risk Preferences */}
      <SettingsForm />

      {/* Cloud Database Health & Seeding Engine */}
      <DatabaseSeedCard />
    </div>
  );
}
