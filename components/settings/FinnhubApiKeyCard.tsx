"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getFeedConfigurationAction,
  testMarketFeedAction,
} from "@/app/actions/marketActions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function FinnhubApiKeyCard() {
  const [configured, setConfigured] = useState<boolean | null>(null),
    [testing, setTesting] = useState(false);
  useEffect(() => {
    void getFeedConfigurationAction()
      .then((result) => setConfigured(result.configured))
      .catch(() => setConfigured(false));
  }, []);
  const test = async () => {
    setTesting(true);
    try {
      const result = await testMarketFeedAction();
      if (result.success) toast.success("Forex candle access verified.");
      else toast.error(result.error);
    } finally {
      setTesting(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Market data connection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          {configured === null
            ? "Checking configuration…"
            : configured
              ? "Server API key configured. Forex data access depends on your provider subscription."
              : "Market feed is not configured."}
        </p>
        <p className="text-muted-foreground">
          Configure FINNHUB_API_KEY on the server to enable quotes, indicators,
          and background scans. Keys stay on the server.
        </p>
        <Button onClick={test} disabled={!configured || testing}>
          {testing ? "Testing…" : "Test forex data access"}
        </Button>
      </CardContent>
    </Card>
  );
}
