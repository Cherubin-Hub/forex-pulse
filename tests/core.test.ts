import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePositionSize,
  calculatePortfolioExposure,
} from "../lib/riskUtils";
import { evaluateCircuitBreaker } from "../lib/circuitBreakerUtils";
import { calculateRealizedR } from "../lib/postMortemUtils";
import {
  calculateSetupAnalytics,
  calculateTagAnalytics,
} from "../lib/analyticsUtils";
import { calculateCumulativeRCurve } from "../lib/exportUtils";
import { settingsSchema } from "../lib/schemas/settings";
import { DEFAULT_SETTINGS } from "../lib/constants/settings";
import { createSetupSchema } from "../lib/schemas/setup";
import { isVerifiedQuote } from "../lib/marketQuality";
import { MOCK_QUOTES } from "../lib/mock/quotes";
import { safeReturnPath } from "../lib/redirects";
import { hasSecretAuthorization } from "../lib/cronAuth";
import { aggregateFourHourCandles, buildIndicators } from "../lib/indicators";
import { evaluatePreTradeAudit } from "../lib/gatekeeperUtils";
import { resolveScannerConfig } from "../lib/scannerUtils";
import { getCurrentSessionWindow, getSessionWindow } from "../lib/reportUtils";
import { macroIngestionSchema } from "../lib/schemas/ingestion";
import type { TradingSetup } from "../types/setup";
import type { CandleSeries } from "../types/feed";
const now = new Date("2026-10-21T08:00:00Z");
const setup: TradingSetup = {
  id: "test",
  symbol: "EURUSD",
  direction: "LONG",
  entryMin: 1.1,
  entryMax: 1.1,
  stopLoss: 1.09,
  originalStopLoss: 1.09,
  takeProfit1: 1.12,
  takeProfit2: null,
  riskReward: 2,
  status: "SL_HIT",
  invalidationRule: "H1 close below stop",
  notes: "",
  confluenceTags: [],
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  closedAt: now.toISOString(),
};

test("invalid sizing and subminimum positions never force a minimum lot", () => {
  for (const input of [
    { balance: 0, mode: "PIPS" as const, slPips: 20 },
    {
      balance: 10000,
      mode: "PRICE" as const,
      entryPrice: 1.1,
      stopLossPrice: 1.1,
    },
    { balance: 1, mode: "PIPS" as const, slPips: 20 },
  ]) {
    const result = calculatePositionSize({
      ...input,
      riskPercent: 1,
      symbol: "EURUSD",
      marketPrice: 1.1,
    });
    assert.equal(result.lotSize, 0);
    assert.ok(result.error);
  }
});
test("USDCHF sizing uses the exchange rate and rounds down within budget", () => {
  const result = calculatePositionSize({
    balance: 10000,
    riskPercent: 1,
    symbol: "USDCHF",
    mode: "PIPS",
    slPips: 20,
    marketPrice: 0.88175,
    leverage: 100,
  });
  assert.equal(result.lotSize, 0.44);
  assert.ok(result.actualRiskAmount <= 100);
  assert.equal(result.estimatedMargin, 440);
});
test("margin converts USD quote instruments and respects leverage", () => {
  const result = calculatePositionSize({
    balance: 10000,
    riskPercent: 1,
    symbol: "EURUSD",
    mode: "PIPS",
    slPips: 20,
    marketPrice: 1.2,
    leverage: 50,
  });
  assert.equal(result.estimatedMargin, 1200);
});
test("daily risk budget decreases after losses", () => {
  for (const [count, remaining] of [
    [0, 2],
    [1, 1],
    [2, 0],
  ]) {
    const rows = Array.from({ length: count }, (_, index) => ({
      ...setup,
      id: String(index),
      realizedR: -1,
    }));
    const result = evaluateCircuitBreaker(rows, DEFAULT_SETTINGS, now);
    assert.equal(result.remainingRiskBudgetR, remaining);
    assert.equal(result.isTradingLocked, count === 2);
  }
});
test("breakeven stays flat in every journal aggregation", () => {
  const flat = { ...setup, stopLoss: 1.1, realizedR: 0 };
  assert.equal(calculateRealizedR(flat), 0);
  assert.equal(calculateSetupAnalytics([flat]).losses, 0);
  assert.equal(calculateSetupAnalytics([flat]).netR, 0);
  assert.equal(calculateCumulativeRCurve([flat])[0].cumulativeR, 0);
  assert.equal(
    evaluateCircuitBreaker([flat], DEFAULT_SETTINGS, now).todayLossCount,
    0,
  );
});
test("self-exclusion is server data and independent of browser storage", () => {
  assert.equal(
    evaluateCircuitBreaker(
      [],
      { ...DEFAULT_SETTINGS, manualLockoutUntil: "2026-10-21T10:00:00Z" },
      now,
    ).isTradingLocked,
    true,
  );
});
test("unsupported symbols and reversed entry zones are rejected", () => {
  const input = {
    symbol: "EURUSD",
    direction: "LONG",
    entryMin: 1.12,
    entryMax: 1.1,
    stopLoss: 1.09,
    takeProfit1: 1.14,
    invalidationRule: "H1 close below stop",
  };
  assert.equal(createSetupSchema.safeParse(input).success, false);
  assert.equal(
    createSetupSchema.safeParse({ ...input, entryMin: 1.1, symbol: "BADUSD" })
      .success,
    false,
  );
});
test("demo, stale and non-finite quotes cannot drive execution", () => {
  assert.equal(isVerifiedQuote(MOCK_QUOTES[0]), false);
  const quote = {
    ...MOCK_QUOTES[0],
    status: "LIVE" as const,
    timestamp: new Date().toISOString(),
  };
  assert.equal(isVerifiedQuote(quote), true);
  assert.equal(
    isVerifiedQuote({
      ...quote,
      timestamp: new Date(Date.now() - 180000).toISOString(),
    }),
    false,
  );
  assert.equal(isVerifiedQuote({ ...quote, price: Infinity }), false);
});
test("redirects cannot escape application origin", () => {
  for (const value of [
    "//external.example",
    "/\\external.example",
    "/ /evil",
    "https://external.example",
  ]) {
    assert.equal(safeReturnPath(value), "/dashboard");
  }
  assert.equal(safeReturnPath("/setups?view=active"), "/setups?view=active");
});
test("cron auth fails closed and accepts only the bearer header", () => {
  assert.equal(hasSecretAuthorization(new Headers(), undefined), false);
  assert.equal(
    hasSecretAuthorization(
      new Headers({ authorization: "Bearer wrong" }),
      "secret",
    ),
    false,
  );
  assert.equal(
    hasSecretAuthorization(
      new Headers({ authorization: "Bearer secret" }),
      "secret",
    ),
    true,
  );
});
test("H4 uses exactly four aligned H1 candles", () => {
  const series: CandleSeries = {
    times: [0, 3600, 7200, 10800, 14400],
    opens: [1, 2, 3, 4, 5],
    highs: [2, 3, 4, 5, 6],
    lows: [0, 1, 2, 3, 4],
    closes: [1.5, 2.5, 3.5, 4.5, 5.5],
  };
  const h4 = aggregateFourHourCandles(series);
  assert.deepEqual(h4, {
    times: [0],
    opens: [1],
    highs: [5],
    lows: [0],
    closes: [4.5],
  });
  assert.equal(
    aggregateFourHourCandles({
      ...series,
      times: [0, 3600, 10800, 14400, 18000],
    }).times.length,
    0,
  );
});
test("technical analysis refuses insufficient history", () => {
  assert.equal(
    buildIndicators(
      { times: [1], opens: [1], highs: [2], lows: [0.5], closes: [1] },
      10000,
      3600,
    ),
    null,
  );
});
test("news gate honors the account sensitivity and blocks at release time", () => {
  const event = {
    id: "news",
    title: "CPI",
    currency: "USD",
    impact: "HIGH" as const,
    scheduledAt: new Date(now.getTime() + 20 * 60000).toISOString(),
    forecast: null,
    previous: null,
    actual: null,
    source: "https://source.example",
    status: "LIVE" as const,
  };
  assert.equal(
    evaluatePreTradeAudit(setup, [event], [], DEFAULT_SETTINGS, now).newsCheck
      .verdict,
    "BLOCKED",
  );
  assert.equal(
    evaluatePreTradeAudit(
      setup,
      [event],
      [],
      { ...DEFAULT_SETTINGS, newsSensitivity: "AGGRESSIVE" },
      now,
    ).newsCheck.verdict,
    "PASS",
  );
  assert.equal(
    evaluatePreTradeAudit(
      setup,
      [{ ...event, scheduledAt: now.toISOString() }],
      [],
      DEFAULT_SETTINGS,
      now,
    ).newsCheck.verdict,
    "BLOCKED",
  );
});
test("report windows follow London DST", () => {
  assert.equal(
    getCurrentSessionWindow(
      new Date("2026-07-15T08:00:00Z"),
    ).windowStart.toISOString(),
    "2026-07-15T07:00:00.000Z",
  );
  assert.equal(
    getCurrentSessionWindow(
      new Date("2026-12-15T08:30:00Z"),
    ).windowStart.toISOString(),
    "2026-12-15T08:00:00.000Z",
  );
});
test("ingestion rejects stale observations and incomplete coverage", () => {
  assert.equal(
    macroIngestionSchema.safeParse({
      feed: "calendar",
      source: "https://source.example",
      observedAt: now.toISOString(),
      coverageFrom: now.toISOString(),
      coverageUntil: now.toISOString(),
      records: [],
    }).success,
    false,
  );
});

test("scanner preserves explicit thresholds and profile defaults", () => {
  assert.equal(
    resolveScannerConfig({ traderProfile: "SCALPER" }).minConfluenceScore,
    60,
  );
  assert.equal(
    resolveScannerConfig({
      traderProfile: "SCALPER",
      minRiskReward: 2,
      minConfluenceScore: 70,
    }).minRiskReward,
    2,
  );
  assert.equal(
    resolveScannerConfig({
      traderProfile: "SWING_TRADER",
      minConfluenceScore: 70,
    }).minConfluenceScore,
    70,
  );
});
test("manual reports use the chosen session window throughout the day", () => {
  assert.equal(
    getSessionWindow(
      "LONDON_OPEN",
      new Date("2026-07-15T08:00:00Z"),
    ).toISOString(),
    getSessionWindow(
      "LONDON_OPEN",
      new Date("2026-07-15T18:00:00Z"),
    ).toISOString(),
  );
});

test("flat results count as completed without manufacturing profit factor", () => {
  const flat = { ...setup, confluenceTags: ["review"], realizedR: 0 };
  assert.equal(calculateTagAnalytics([flat])[0].completedTrades, 1);
  assert.equal(
    calculateSetupAnalytics([{ ...setup, status: "TP_REACHED", realizedR: 2 }])
      .profitFactor,
    null,
  );
});

test("settings accept PostgreSQL timezone offsets for durable self-exclusion", () => {
  assert.equal(
    settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      manualLockoutUntil: "2026-10-21T18:00:00+00:00",
    }).success,
    true,
  );
});

test("portfolio exposure retains each setup's original risk percentage", () => {
  const positions = [
    { ...setup, status: "ENTRY_TRIGGERED" as const, riskPercent: 0.5 },
    {
      ...setup,
      id: "other",
      status: "WAITING_FOR_CONFIRMATION" as const,
      riskPercent: 1,
    },
  ];
  assert.equal(
    calculatePortfolioExposure(
      positions,
      { ...DEFAULT_SETTINGS, riskPerTradePercent: 2 },
      10000,
    ).totalRiskPercent,
    1.5,
  );
});
