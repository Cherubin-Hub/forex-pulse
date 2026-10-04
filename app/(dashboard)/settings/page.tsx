import { SettingsForm } from "@/components/settings/SettingsForm";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Preferences</h2>
        <p className="text-sm text-muted-foreground">
          These settings personalise analysis, alerts and risk checks. Saved in this browser for now.
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}
