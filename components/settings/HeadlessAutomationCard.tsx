"use client";
import { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { triggerHeadlessCycleAction } from "@/app/actions/scannerActions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTimePHT } from "@/lib/formatters";
export function HeadlessAutomationCard() {
  const { settings } = useSettings();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(
      "No cycle has been checked in this session.",
    );
  const check = async () => {
    setBusy(true);
    try {
      const result = await triggerHeadlessCycleAction();
      setMessage(
        result.success
          ? `${formatTimePHT(result.timestamp)}: ${result.setupsCreated} setups created; ${result.setupsUpdated} updated.${result.error ? ` ${result.error}` : ""}`
          : (result.error ?? "Cycle failed"),
      );
    } catch {
      setMessage("Cycle could not be checked.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account automation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          {settings.automationEnabled
            ? "Automatic setup creation and monitoring enabled."
            : "Manual mode. Background creation and monitoring are disabled."}
        </p>
        <p className="text-muted-foreground">
          Scheduled cycles require a configured cron service. Status changes
          reflect sampled verified prices in this journal; they do not place or
          protect orders at a broker.
        </p>
        <p>{message}</p>
        <Button onClick={check} disabled={busy}>
          {busy ? "Checking…" : "Check this account now"}
        </Button>
      </CardContent>
    </Card>
  );
}
