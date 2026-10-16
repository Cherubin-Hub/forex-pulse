"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Zap, CheckCircle2, XCircle, AlertTriangle, Cpu, FileText } from "lucide-react";
import type { PriceQuote } from "@/types/market";
import type { TradingSetup } from "@/types/setup";
import { MOCK_QUOTES } from "@/lib/mock/quotes";
import { updateSetupStatus } from "@/app/actions/setupActions";
import { runMarketScanAction } from "@/app/actions/scannerActions";
import { autoGenerateSessionReportAction } from "@/app/actions/reportActions";
import { evaluateSetupAutoResolution } from "@/lib/services/autoExecutionEngine";
import { createClient } from "@/lib/supabase/client";
import {
  getFinnhubApiKey,
  SYMBOL_MAP_TO_FINNHUB,
  SYMBOL_MAP_FROM_FINNHUB,
} from "@/lib/services/finnhub";

interface AutoTradeContextValue {
  quotes: PriceQuote[];
  getQuote: (symbol: string) => PriceQuote | null;
  isStreaming: boolean;
  setIsStreaming: (active: boolean) => void;
  triggerManualScan: () => Promise<void>;
  isScanning: boolean;
  feedSource: "FINNHUB_WS" | "SIMULATED";
}

const AutoTradeContext = createContext<AutoTradeContextValue | null>(null);

export function useLiveMarket() {
  const ctx = useContext(AutoTradeContext);
  if (!ctx) {
    throw new Error("useLiveMarket must be used within an AutoTradeAutomationProvider");
  }
  return ctx;
}

interface AutoTradeAutomationProviderProps {
  children: ReactNode;
  initialQuotes: PriceQuote[];
  activeSetups: TradingSetup[];
}

export function AutoTradeAutomationProvider({
  children,
  initialQuotes,
  activeSetups,
}: AutoTradeAutomationProviderProps) {
  const router = useRouter();

  // 1. Live market quotes state
  const [quotes, setQuotes] = useState<PriceQuote[]>(() => {
    return initialQuotes && initialQuotes.length > 0 ? initialQuotes : MOCK_QUOTES;
  });
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [feedSource, setFeedSource] = useState<"FINNHUB_WS" | "SIMULATED">("SIMULATED");

  // Lock refs to prevent duplicate server actions or race conditions
  const inFlightSetupsRef = useRef<Set<string>>(new Set());
  const resolvedSetupsRef = useRef<Set<string>>(new Set());
  const isScannerRunningRef = useRef<boolean>(false);
  const isReportCheckRunningRef = useRef<boolean>(false);

  // 2. Real-time Market Stream: Prioritizes Finnhub WebSocket, falls back to simulated micro-ticks
  useEffect(() => {
    if (!isStreaming) return;

    let socket: WebSocket | null = null;
    let fallbackTimer: NodeJS.Timeout | null = null;
    const apiKey = getFinnhubApiKey();

    if (apiKey) {
      try {
        socket = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);

        socket.onopen = () => {
          setFeedSource("FINNHUB_WS");
          Object.values(SYMBOL_MAP_TO_FINNHUB).forEach((finnhubSymbol) => {
            if (socket?.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: "subscribe", symbol: finnhubSymbol }));
            }
          });
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "trade" && Array.isArray(payload.data)) {
              setQuotes((currentQuotes) => {
                let updated = [...currentQuotes];
                const nowIso = new Date().toISOString();
                for (const trade of payload.data) {
                  const internalSymbol = SYMBOL_MAP_FROM_FINNHUB[trade.s];
                  if (internalSymbol && trade.p) {
                    updated = updated.map((q) =>
                      q.symbol === internalSymbol
                        ? {
                            ...q,
                            price: trade.p,
                            high: q.high !== null ? Math.max(q.high, trade.p) : trade.p,
                            low: q.low !== null ? Math.min(q.low, trade.p) : trade.p,
                            timestamp: nowIso,
                            sparkline: q.sparkline && q.sparkline.length > 0
                              ? [...q.sparkline.slice(1), trade.p]
                              : [trade.p],
                          }
                        : q
                    );
                  }
                }
                return updated;
              });
            }
          } catch {
            // Ignore malformed frames
          }
        };

        socket.onerror = () => {
          setFeedSource("SIMULATED");
        };

        socket.onclose = () => {
          setFeedSource("SIMULATED");
        };
      } catch {
        setFeedSource("SIMULATED");
      }
    } else {
      setFeedSource("SIMULATED");
    }

    // Micro-tick simulation loop: runs continuously if no Finnhub key, or as a weekend/heartbeat pulse
    fallbackTimer = setInterval(() => {
      setQuotes((currentQuotes) => {
        if (currentQuotes.length === 0) return currentQuotes;
        // Select 1 or 2 random pairs to tick per pulse
        const numTicks = Math.random() > 0.4 ? 2 : 1;
        const indicesToTick = new Set<number>();
        while (indicesToTick.size < numTicks && indicesToTick.size < currentQuotes.length) {
          indicesToTick.add(Math.floor(Math.random() * currentQuotes.length));
        }

        const nowIso = new Date().toISOString();

        return currentQuotes.map((q, idx) => {
          if (!indicesToTick.has(idx) || q.price === null) return q;

          const isJpy = q.symbol.includes("JPY");
          const isGold = q.symbol === "XAUUSD";
          const deltaPip = (Math.random() * 0.8 - 0.4) * (isGold ? 0.08 : isJpy ? 0.03 : 0.00008);

          const nextPrice = Number(
            (q.price + deltaPip).toFixed(
              isGold ? 2 : isJpy ? 3 : 5
            )
          );

          const updatedSparkline = q.sparkline && q.sparkline.length > 0
            ? [...q.sparkline.slice(1), nextPrice]
            : [nextPrice];

          return {
            ...q,
            price: nextPrice,
            high: q.high !== null ? Math.max(q.high, nextPrice) : nextPrice,
            low: q.low !== null ? Math.min(q.low, nextPrice) : nextPrice,
            timestamp: nowIso,
            sparkline: updatedSparkline,
          };
        });
      });
    }, 1800);

    return () => {
      if (socket) socket.close();
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [isStreaming]);

  // 3. Automated Trade Resolution Engine: Check active setups against ticking quotes
  useEffect(() => {
    if (activeSetups.length === 0 || quotes.length === 0) return;

    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    for (const setup of activeSetups) {
      // Skip if already in flight or already resolved in this session
      if (inFlightSetupsRef.current.has(setup.id) || resolvedSetupsRef.current.has(setup.id)) {
        continue;
      }

      const quote = quoteMap.get(setup.symbol);
      if (!quote || quote.price === null) continue;

      const resolution = evaluateSetupAutoResolution(setup, quote.price);
      if (!resolution) continue;

      // Lock setup ID immediately
      inFlightSetupsRef.current.add(setup.id);

      // Execute status transition asynchronously
      (async () => {
        try {
          const res = await updateSetupStatus(setup.id, resolution.nextStatus);

          if (res.success) {
            resolvedSetupsRef.current.add(setup.id);

            switch (resolution.nextStatus) {
              case "TP_REACHED":
                toast.success(`🎯 Take Profit Auto-Reached: ${setup.symbol}!`, {
                  description: `${resolution.reason} Setup closed as Won (+${resolution.pnlR ?? setup.riskReward}R).`,
                  icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
                  duration: 8000,
                });
                break;

              case "SL_HIT":
                toast.error(`🛑 Stop Loss Auto-Hit: ${setup.symbol}!`, {
                  description: `${resolution.reason} Risk preserved at -1.0R.`,
                  icon: <XCircle className="h-4 w-4 text-rose-500" />,
                  duration: 8000,
                });
                break;

              case "ENTRY_TRIGGERED":
                toast.info(`⚡ Setup Auto-Triggered: ${setup.symbol}!`, {
                  description: `${resolution.reason} Trade is now ACTIVE in market.`,
                  icon: <Zap className="h-4 w-4 text-sky-400" />,
                  duration: 7000,
                });
                break;

              case "INVALIDATED":
                toast.warning(`⚠️ Setup Auto-Invalidated: ${setup.symbol}`, {
                  description: resolution.reason,
                  icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
                  duration: 6000,
                });
                break;
            }

            // Immediately refresh App Router server components
            router.refresh();
          } else {
            console.error("[AutoTradeEngine] Status update failed:", res.error);
            // Unlock on failure so it can retry
            inFlightSetupsRef.current.delete(setup.id);
          }
        } catch (err) {
          console.error("[AutoTradeEngine] Execution error:", err);
          inFlightSetupsRef.current.delete(setup.id);
        }
      })();
    }
  }, [quotes, activeSetups, router]);

  // 4. Automated Strategy Scanner Engine: Periodically analyzes the market and auto-commits
  const executeAutoScan = useCallback(async (silent = true) => {
    if (isScannerRunningRef.current) return;
    isScannerRunningRef.current = true;
    setIsScanning(true);

    try {
      const res = await runMarketScanAction({
        autoCommit: true,
        minConfluenceScore: 75,
        minRiskReward: 2.0,
        enableNewsFilter: true,
      });

      if (res.success && res.result) {
        if (res.result.committedCount > 0) {
          toast.success(
            `⚡ Automated Market Scanner: Committed ${res.result.committedCount} High-Confluence Setup(s)!`,
            {
              description: "New setups added to Active Setups and auto-monitored.",
              icon: <Cpu className="h-4 w-4 text-sky-400" />,
              duration: 8000,
            }
          );
          router.refresh();
        } else if (!silent) {
          toast.info("Market scan complete. No new qualifying setups found.");
        }
      }
    } catch (err) {
      console.warn("[AutoScan] Background scan failed:", err);
    } finally {
      setIsScanning(false);
      isScannerRunningRef.current = false;
    }
  }, [router]);

  // Run auto-scanner on mount (after 2.5s) and every 3 minutes
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      executeAutoScan(true);
    }, 2500);

    const THREE_MINUTES = 3 * 60 * 1000;
    const interval = setInterval(() => {
      executeAutoScan(true);
    }, THREE_MINUTES);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [executeAutoScan]);

  // 5. Automated Session Report Engine: Periodically checks and synthesizes pre-session briefings
  const executeAutoReportCheck = useCallback(async () => {
    if (isReportCheckRunningRef.current) return;
    isReportCheckRunningRef.current = true;

    try {
      const res = await autoGenerateSessionReportAction();
      if (res.success && res.generated && res.report) {
        const sessionLabel = res.session?.replace("_", " ") ?? "Session";
        toast.success(`📋 ${sessionLabel} Briefing Auto-Generated!`, {
          description: res.report.title,
          icon: <FileText className="h-4 w-4 text-primary" />,
          action: {
            label: "View Report",
            onClick: () => router.push("/reports"),
          },
          duration: 10000,
        });
        router.refresh();
      }
    } catch (err) {
      console.warn("[AutoReportCheck] Background check failed:", err);
    } finally {
      isReportCheckRunningRef.current = false;
    }
  }, [router]);

  // Run auto-report verification on mount (after 4s) and every 5 minutes
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      executeAutoReportCheck();
    }, 4000);

    const FIVE_MINUTES = 5 * 60 * 1000;
    const interval = setInterval(() => {
      executeAutoReportCheck();
    }, FIVE_MINUTES);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [executeAutoReportCheck]);

  // 6. Supabase Realtime Listener (sync database changes across browser tabs)
  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch (err) {
      console.debug("[Realtime] Supabase unavailable for auto-sync, running offline:", err);
      return;
    }

    if (!supabase) return;

    const channel = supabase
      .channel("forex_pulse_auto_sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_setups",
        },
        () => {
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_reports",
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [router]);

  const getQuote = useCallback(
    (symbol: string): PriceQuote | null => {
      return quotes.find((q) => q.symbol === symbol) ?? null;
    },
    [quotes]
  );

  const contextValue: AutoTradeContextValue = {
    quotes,
    getQuote,
    isStreaming,
    setIsStreaming,
    triggerManualScan: () => executeAutoScan(false),
    isScanning,
    feedSource,
  };

  return (
    <AutoTradeContext.Provider value={contextValue}>
      {children}
    </AutoTradeContext.Provider>
  );
}
