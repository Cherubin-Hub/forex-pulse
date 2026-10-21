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
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<string>("YAHOO");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void getFeedConfigurationAction()
      .then((result) => {
        setConfigured(result.configured);
        setProvider(result.provider);
      })
      .catch(() => setConfigured(false));
  }, []);

  const test = async () => {
    setTesting(true);
    try {
      const result = await testMarketFeedAction();
      if (result.success) {
        toast.success("Forex & Gold live candle access verified.");
      } else {
        toast.error(result.error);
      }
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
              ? provider === "YAHOO"
                ? "Live market feed active (Zero-cost real-time feed enabled for Forex & Gold)."
                : "Server API key configured."
              : "Market feed is not configured."}
        </p>
        <p className="text-muted-foreground">
          Forex and Gold (XAU/USD) quotes, indicators (RSI, EMA, ATR, MACD), and
          automated opportunity scans are actively powered by the live feed.
        </p>
        <Button onClick={test} disabled={!configured || testing}>
          {testing ? "Testing…" : "Test forex data access"}
        </Button>
      </CardContent>
    </Card>
  );
}
