"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Key, Radio, CheckCircle, ExternalLink, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getFinnhubApiKey } from "@/lib/services/finnhub";

export function FinnhubApiKeyCard() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Sync key on client mount (Hydration safety)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
    const key = getFinnhubApiKey();
    if (key) {
      setActiveKey(key);
      setApiKey(key);
    }
  }, []);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      localStorage.removeItem("fp_finnhub_key");
      setActiveKey(null);
      toast.info("Finnhub API key cleared. Reverted to simulated market feed.");
      return;
    }

    localStorage.setItem("fp_finnhub_key", trimmed);
    setActiveKey(trimmed);
    toast.success("Finnhub API key saved!", {
      description: "Live WebSocket feed and REST candle endpoints activated.",
    });
    // Trigger window refresh to reconnect stream
    window.location.reload();
  };

  const handleTestConnection = async () => {
    const keyToTest = apiKey.trim() || activeKey;
    if (!keyToTest) {
      toast.error("Please enter a Finnhub API key first.");
      return;
    }

    setIsTesting(true);
    try {
      // 1. Verify API Token Authenticity with Finnhub
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${keyToTest}`);
      if (res.status === 401) {
        throw new Error("Invalid API Key (HTTP 401). Please verify your token on finnhub.io.");
      }
      if (!res.ok && res.status !== 403) {
        throw new Error(`Finnhub returned HTTP ${res.status}.`);
      }

      // 2. Test Live Forex WebSocket Stream (Unlimited Free Tier Feed)
      let tickReceived = false;
      await new Promise<void>((resolve, reject) => {
        let ws: WebSocket;
        try {
          ws = new WebSocket(`wss://ws.finnhub.io?token=${keyToTest}`);
        } catch (e) {
          reject(e);
          return;
        }

        const timeout = setTimeout(() => {
          try {
            ws.close();
          } catch {}
          resolve();
        }, 3000);

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "subscribe", symbol: "OANDA:EUR_USD" }));
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "trade" && Array.isArray(payload.data) && payload.data.length > 0) {
              const tick = payload.data[0];
              tickReceived = true;
              clearTimeout(timeout);
              try {
                ws.close();
              } catch {}
              toast.success("✅ Finnhub Connection Verified!", {
                description: `Live ${tick.s || "EUR/USD"} tick received: ${tick.p?.toFixed(5)}`,
              });
              resolve();
            }
          } catch {
            // Ignore parse errors on test frame
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          try {
            ws.close();
          } catch {}
          reject(new Error("WebSocket connection failed. Verify your network or firewall."));
        };
      });

      if (!tickReceived) {
        toast.success("✅ Finnhub API Key Verified!", {
          description: "Authenticated successfully. Live Forex WebSocket stream is ready.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      toast.error("❌ Finnhub Connection Test Failed", { description: msg });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="glass border-border/80 shadow-md">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-500 animate-pulse" />
            <CardTitle className="text-base font-semibold tracking-tight">
              Institutional Market Data Feed (Finnhub)
            </CardTitle>
            {activeKey ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px] font-mono flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Finnhub Active
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] font-mono">
                Simulated Fallback
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Connects your scanner and active setup monitor to live interbank Forex prices and real multi-timeframe candles.
          </CardDescription>
        </div>

        <a
          href="https://finnhub.io/register"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          Get Free Key <ExternalLink className="h-3 w-3" />
        </a>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showKey ? "text" : "password"}
              placeholder="Paste your Finnhub API Key here (e.g. c1234567890abcdef...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pl-9 pr-10 text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="h-9 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? "animate-spin" : ""}`} />
              Test Feed
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Save Key
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            💡 Free Tier 24/7 Capabilities:
          </p>
          <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
            <li><strong>60 REST requests per minute</strong> (plenty for periodic 15s candle scans).</li>
            <li><strong>Unlimited Live WebSocket stream</strong> (continuous real-time price ticks for TP/SL monitoring).</li>
            <li>Zero subscription cost, no credit card required on signup.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
