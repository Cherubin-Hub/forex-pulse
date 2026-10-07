"use client";

import { useEffect, useRef, memo } from "react";
import { useTheme } from "next-themes";

interface TradingViewWidgetProps {
  symbol?: string; // e.g. "EURUSD", "GBPUSD", "XAUUSD"
  interval?: "1" | "5" | "15" | "60" | "240" | "D" | "W";
  height?: number | string;
  autosize?: boolean;
}

// Map local symbols to TradingView broker tickers
function formatTradingViewSymbol(symbol: string): string {
  const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  if (cleanSymbol === "XAUUSD") {
    return "OANDA:XAUUSD";
  }
  if (cleanSymbol === "USDJPY" || cleanSymbol === "EURUSD" || cleanSymbol === "GBPUSD" || cleanSymbol === "AUDUSD" || cleanSymbol === "USDCAD" || cleanSymbol === "USDCHF") {
    return `FX:${cleanSymbol}`;
  }
  return `FX:${cleanSymbol}`;
}

export const TradingViewWidget = memo(function TradingViewWidget({
  symbol = "EURUSD",
  interval = "60",
  height = 500,
  autosize = true,
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any previous widget DOM to prevent duplicate embeds
    container.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";
    container.appendChild(widgetContainer);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    const tvSymbol = formatTradingViewSymbol(symbol);
    const isDark = resolvedTheme === "dark";

    script.innerHTML = JSON.stringify({
      autosize,
      height: typeof height === "number" ? height : undefined,
      symbol: tvSymbol,
      interval,
      timezone: "Asia/Manila", // PHT timezone as per project specs
      theme: isDark ? "dark" : "light",
      style: "1", // 1 = Candlesticks
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      backgroundColor: isDark ? "#090d16" : "#ffffff",
      gridColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [symbol, interval, height, autosize, resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      style={{ height: typeof height === "number" ? `${height}px` : height, minHeight: "450px" }}
    />
  );
});
