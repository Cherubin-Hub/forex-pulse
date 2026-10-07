import type { SessionReport } from "@/types/report";

export const MOCK_REPORTS: SessionReport[] = [
  {
    id: "rep-001",
    title: "London Pre-Session Intelligence Brief",
    session: "LONDON_OPEN",
    timestamp: new Date().toISOString(),
    bias: "BEARISH_USD",
    volatility: "HIGH",
    executiveSummary:
      "The US Dollar Index (DXY) is testing key resistance near 101.40 after dovish Fed comments. European equity futures are pointing upward, creating strong confluence for European currency appreciation against the greenback into the London morning crossover.",
    macroCatalysts: [
      "ECB President speech scheduled at 16:30 PHT.",
      "UK Claimant Count Change surprise contraction supporting GBP strength.",
      "Yield curve inversion narrowing slightly as safe-haven USD bid subsides.",
    ],
    keyLevels: [
      {
        symbol: "EURUSD",
        support: 1.118,
        pivot: 1.1225,
        resistance: 1.129,
        bias: "BULLISH",
      },
      {
        symbol: "GBPUSD",
        support: 1.308,
        pivot: 1.314,
        resistance: 1.3235,
        bias: "BULLISH",
      },
      {
        symbol: "USDJPY",
        support: 147.2,
        pivot: 148.0,
        resistance: 148.9,
        bias: "BEARISH",
      },
    ],
    playbook: {
      focusPairs: ["EURUSD", "GBPUSD", "XAUUSD"],
      riskRule: "No new executions within 15 minutes of 16:30 PHT ECB speech.",
      tradeOpportunities: [
        "Monitor EURUSD pullback to 1.1225 pivot zone for long continuation.",
        "Watch GBPUSD liquidity sweep of Asian high (1.3175) for London expansion.",
      ],
    },
  },
  {
    id: "rep-002",
    title: "New York Overlap & CPI Fallout Analysis",
    session: "NEW_YORK_OPEN",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    bias: "RISK_OFF",
    volatility: "EXTREME",
    executiveSummary:
      "Hotter-than-forecast US Core CPI sparked aggressive repricing of terminal rates. Equities sold off heavily at NY open, driving aggressive safe-haven flows back into USD and Gold while triggering widespread stops across risk-correlated pairs.",
    macroCatalysts: [
      "US Core CPI MoM printed +0.3% vs +0.2% expected.",
      "10-Year Treasury Yields surged +12 bps to 4.12%.",
      "Crude oil pulled back 2% amid demand fears.",
    ],
    keyLevels: [
      {
        symbol: "EURUSD",
        support: 1.114,
        pivot: 1.121,
        resistance: 1.127,
        bias: "BEARISH",
      },
      {
        symbol: "XAUUSD",
        support: 2615.0,
        pivot: 2640.0,
        resistance: 2665.0,
        bias: "BULLISH",
      },
    ],
    playbook: {
      focusPairs: ["EURUSD", "XAUUSD"],
      riskRule: "Cut standard risk to 0.5% per trade due to heightened slippage.",
      tradeOpportunities: [
        "Fading relief rallies on EURUSD towards 1.1200 rejection blocks.",
        "Gold dip-buying on H1 support retest around 2620.",
      ],
    },
  },
  {
    id: "rep-003",
    title: "Asian Session Liquidity & Range Wrap",
    session: "ASIAN_WRAP",
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    bias: "NEUTRAL",
    volatility: "LOW",
    executiveSummary:
      "Tokyo session traded in compressed 25-pip ranges across majors. Japanese preliminary retail data met consensus without triggering BOJ intervention speculation. Asian range extremes are clearly delineated and ripe for London breakout liquidity grabs.",
    macroCatalysts: [
      "BOJ Governor reiterated cautious gradual policy normalization.",
      "China central bank kept 1-year and 5-year LPR unchanged.",
    ],
    keyLevels: [
      {
        symbol: "USDJPY",
        support: 147.8,
        pivot: 148.2,
        resistance: 148.65,
        bias: "NEUTRAL",
      },
      {
        symbol: "AUDUSD",
        support: 0.662,
        pivot: 0.665,
        resistance: 0.6685,
        bias: "NEUTRAL",
      },
    ],
    playbook: {
      focusPairs: ["USDJPY", "AUDUSD"],
      riskRule: "Avoid entering within inner Asian range boundaries.",
      tradeOpportunities: [
        "Mark Asian high (148.65) and low (147.80) on USDJPY for London sweep setups.",
      ],
    },
  },
];
