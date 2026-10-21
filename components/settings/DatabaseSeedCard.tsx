"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function DatabaseSeedCard() {
  const [message, setMessage] = useState("Not checked"),
    [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/seed");
      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };
      setMessage(
        response.ok && data.success
          ? "Database connected"
          : (data.error ?? "Database unavailable"),
      );
    } catch {
      setMessage("Database unavailable");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Database health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>{message}</p>
        <p className="text-muted-foreground">
          Demo seeding is disabled. Verified data is imported through the
          authenticated macro feed endpoint.
        </p>
        <Button onClick={check} disabled={busy}>
          {busy ? "Checking…" : "Check connection"}
        </Button>
      </CardContent>
    </Card>
  );
}
