"use client";
import {
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
import type { PriceQuote } from "@/types/market";
import type { TradingSetup } from "@/types/setup";
import { useSettings } from "@/components/providers/SettingsProvider";
import { getMarketSnapshotAction } from "@/app/actions/marketActions";
import { triggerHeadlessCycleAction } from "@/app/actions/scannerActions";
import { autoGenerateSessionReportAction } from "@/app/actions/reportActions";
import { isVerifiedQuote, ageQuotes } from "@/lib/marketQuality";

type MarketContext = {
  quotes: PriceQuote[];
  getQuote: (symbol: string) => PriceQuote | null;
  isStreaming: boolean;
  setIsStreaming: (active: boolean) => void;
  triggerManualScan: () => Promise<void>;
  isScanning: boolean;
  feedSource: "FINNHUB_REST" | "SIMULATED" | "UNAVAILABLE";
};
const Context = createContext<MarketContext | null>(null);
export function useLiveMarket() {
  const context = useContext(Context);
  if (!context) throw new Error("Market provider is required");
  return context;
}
export function AutoTradeAutomationProvider({
  children,
  initialQuotes,
  activeSetups: _activeSetups,
}: {
  children: ReactNode;
  initialQuotes: PriceQuote[];
  activeSetups: TradingSetup[];
}) {
  void _activeSetups;
  const [quotes, setQuotes] = useState(initialQuotes),
    [isStreaming, setIsStreaming] = useState(true),
    [isScanning, setIsScanning] = useState(false);
  const { settings, isLoaded } = useSettings();
  const running = useRef(false),
    router = useRouter();
  // Refresh server-rendered quotes when navigation supplies newer data.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
    setQuotes(initialQuotes);
  }, [initialQuotes]);
  useEffect(() => {
    if (!isStreaming) return;
    let cancelled = false,
      busy = false;
    const refresh = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const next = await getMarketSnapshotAction();
        if (!cancelled) setQuotes(next);
      } catch {
        /* Existing quotes retain their original timestamp. */
      } finally {
        busy = false;
      }
    };
    void refresh();
    const timer = setInterval(refresh, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isStreaming]);
  useEffect(() => {
    const timer = setInterval(
      () => setQuotes((current) => ageQuotes(current)),
      10000,
    );
    return () => clearInterval(timer);
  }, []);
  const triggerManualScan = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setIsScanning(true);
    try {
      const result = await triggerHeadlessCycleAction();
      if (!result.success) toast.error(result.error ?? "Cycle failed");
      router.refresh();
    } finally {
      running.current = false;
      setIsScanning(false);
    }
  }, [router]);
  useEffect(() => {
    if (!isLoaded || !settings.automationEnabled) return;
    const run = () => {
      if (!document.hidden) void triggerManualScan();
    };
    const timer = setInterval(run, 60000);
    return () => clearInterval(timer);
  }, [settings.automationEnabled, isLoaded, triggerManualScan]);
  useEffect(() => {
    if (!isLoaded || !settings.automationEnabled) return;
    const timer = setInterval(() => {
      if (!document.hidden) void autoGenerateSessionReportAction();
    }, 300000);
    return () => clearInterval(timer);
  }, [settings.automationEnabled, isLoaded]);
  const getQuote = useCallback(
    (symbol: string) => quotes.find((quote) => quote.symbol === symbol) ?? null,
    [quotes],
  );
  const feedSource = quotes.some((quote) => isVerifiedQuote(quote))
    ? "FINNHUB_REST"
    : quotes.some((quote) => quote.status === "MOCK")
      ? "SIMULATED"
      : "UNAVAILABLE";
  return (
    <Context.Provider
      value={{
        quotes,
        getQuote,
        isStreaming,
        setIsStreaming,
        triggerManualScan,
        isScanning,
        feedSource,
      }}
    >
      {children}
    </Context.Provider>
  );
}
