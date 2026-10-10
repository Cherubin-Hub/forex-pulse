import type { TradingSetup } from "@/types/setup";
import type { UserSettings } from "@/lib/schemas/settings";
import { INSTRUMENTS } from "@/lib/constants/instruments";

export type CalculationMode = "PIPS" | "PRICE";

export type PositionSizeParams = {
  balance: number;
  riskPercent: number;
  symbol: string;
  mode: CalculationMode;
  slPips?: number;
  entryPrice?: number;
  stopLossPrice?: number;
};

export type PositionSizeResult = {
  riskAmount: number;
  lotSize: number;
  miniLots: number;
  microLots: number;
  units: number;
  effectiveSlPips: number;
  pipValuePerLot: number;
  estimatedMargin: number;
};

export type CurrencyNetExposure = {
  currency: string;
  netDirection: "LONG" | "SHORT" | "NEUTRAL";
  netScore: number;
  tradeCount: number;
  symbols: string[];
};

export type PortfolioRiskSummary = {
  openSetupsCount: number;
  maxOpenSetups: number;
  capacityPercent: number;
  totalRiskPercent: number;
  totalRiskAmount: number;
  currencyExposures: CurrencyNetExposure[];
  correlationWarnings: string[];
};

export type DrawdownStep = {
  losses: number;
  remainingBalance: number;
  drawdownPercent: number;
  requiredRecoveryPercent: number;
};

/**
 * Calculates accurate lot sizing, pip value, and margin across Forex and Commodities.
 */
export function calculatePositionSize(params: PositionSizeParams): PositionSizeResult {
  const { balance, riskPercent, symbol, mode, slPips = 20, entryPrice = 0, stopLossPrice = 0 } = params;

  const riskAmount = Number((balance * (riskPercent / 100)).toFixed(2));
  const isGold = symbol === "XAUUSD";
  const isJpy = symbol.includes("JPY");

  let effectiveSlPips = 0;
  let pipValuePerLot = 10; // Default $10/pip for standard EUR/USD lot

  if (isGold) {
    // 1 standard lot = 100 troy oz. $1.00 price change = $100 per lot.
    // 1 pip (0.10) = $10.00 per lot.
    pipValuePerLot = 10;
    if (mode === "PRICE") {
      const priceDistance = Math.abs(entryPrice - stopLossPrice);
      effectiveSlPips = Number((priceDistance * 10).toFixed(1)); // 1 pip = 0.10
    } else {
      effectiveSlPips = Math.max(0.1, slPips);
    }
  } else if (isJpy) {
    // 1 pip = 0.01. Approximate USD value per pip is ~$6.50
    pipValuePerLot = 6.5;
    if (mode === "PRICE") {
      const priceDistance = Math.abs(entryPrice - stopLossPrice);
      effectiveSlPips = Number((priceDistance / 0.01).toFixed(1));
    } else {
      effectiveSlPips = Math.max(1, slPips);
    }
  } else {
    // Standard major pairs (EURUSD, GBPUSD, AUDUSD, etc.)
    pipValuePerLot = symbol === "USDCAD" || symbol === "USDCHF" ? 7.3 : 10;
    if (mode === "PRICE") {
      const priceDistance = Math.abs(entryPrice - stopLossPrice);
      effectiveSlPips = Number((priceDistance / 0.0001).toFixed(1));
    } else {
      effectiveSlPips = Math.max(1, slPips);
    }
  }

  // Prevent division by zero
  const rawLots = effectiveSlPips > 0 ? riskAmount / (effectiveSlPips * pipValuePerLot) : 0;
  const lotSize = Math.max(0.01, Number(rawLots.toFixed(2)));
  const miniLots = Number((lotSize * 10).toFixed(1));
  const microLots = Number((lotSize * 100).toFixed(0));

  const contractMultiplier = isGold ? 100 : 100000;
  const units = Math.round(lotSize * contractMultiplier);

  // Approximate margin required at 1:100 leverage
  const referencePrice = entryPrice > 0 ? entryPrice : isGold ? 2650 : 1.1;
  const notionalValue = isGold ? units * referencePrice : lotSize * 100000;
  const estimatedMargin = Number((notionalValue / 100).toFixed(2));

  return {
    riskAmount,
    lotSize,
    miniLots,
    microLots,
    units,
    effectiveSlPips,
    pipValuePerLot,
    estimatedMargin,
  };
}

/**
 * Aggregates live open risk and directional currency exposures across active setups.
 */
export function calculatePortfolioExposure(
  setups: TradingSetup[],
  settings: UserSettings,
  balance: number
): PortfolioRiskSummary {
  const active = setups.filter(
    (s) => s.status === "WAITING_FOR_CONFIRMATION" || s.status === "ENTRY_TRIGGERED"
  );

  const openSetupsCount = active.length;
  const maxOpenSetups = settings.maxOpenSetups;
  const capacityPercent = Math.min(100, Math.round((openSetupsCount / maxOpenSetups) * 100));

  const totalRiskPercent = Number((openSetupsCount * settings.riskPerTradePercent).toFixed(2));
  const totalRiskAmount = Number((balance * (totalRiskPercent / 100)).toFixed(2));

  // Currency Net Exposure Map
  const currencyScores: Record<string, { net: number; symbols: Set<string> }> = {};

  for (const s of active) {
    const inst = INSTRUMENTS.find((i) => i.symbol === s.symbol);
    const base = inst?.base ?? s.symbol.slice(0, 3);
    const quote = inst?.quote ?? s.symbol.slice(3, 6);

    if (!currencyScores[base]) currencyScores[base] = { net: 0, symbols: new Set() };
    if (!currencyScores[quote]) currencyScores[quote] = { net: 0, symbols: new Set() };

    currencyScores[base].symbols.add(s.symbol);
    currencyScores[quote].symbols.add(s.symbol);

    if (s.direction === "LONG") {
      currencyScores[base].net += 1;
      currencyScores[quote].net -= 1;
    } else {
      currencyScores[base].net -= 1;
      currencyScores[quote].net += 1;
    }
  }

  const currencyExposures: CurrencyNetExposure[] = Object.entries(currencyScores)
    .filter(([_, data]) => data.symbols.size > 0)
    .map(([currency, data]) => {
      let netDirection: "LONG" | "SHORT" | "NEUTRAL" = "NEUTRAL";
      if (data.net > 0) netDirection = "LONG";
      else if (data.net < 0) netDirection = "SHORT";

      return {
        currency,
        netDirection,
        netScore: data.net,
        tradeCount: data.symbols.size,
        symbols: Array.from(data.symbols),
      };
    })
    .sort((a, b) => Math.abs(b.netScore) - Math.abs(a.netScore));

  // Correlation Warnings (Flag when 2 or more positions stack on the same currency direction)
  const correlationWarnings: string[] = [];
  for (const exp of currencyExposures) {
    if (Math.abs(exp.netScore) >= 2) {
      correlationWarnings.push(
        `Correlated Exposure: ${Math.abs(exp.netScore)} setups are Net ${exp.netDirection} on ${exp.currency} (${exp.symbols.join(", ")}).`
      );
    }
  }

  return {
    openSetupsCount,
    maxOpenSetups,
    capacityPercent,
    totalRiskPercent,
    totalRiskAmount,
    currencyExposures,
    correlationWarnings,
  };
}

/**
 * Calculates consecutive drawdown damage and required mathematical recovery gains.
 */
export function calculateDrawdownTable(balance: number, riskPercent: number): DrawdownStep[] {
  const steps = [1, 2, 3, 5, 8, 10];

  return steps.map((losses) => {
    const remaining = balance * Math.pow(1 - riskPercent / 100, losses);
    const drawdownPercent = Number((((balance - remaining) / balance) * 100).toFixed(2));
    const requiredRecoveryPercent = Number((((balance - remaining) / remaining) * 100).toFixed(2));

    return {
      losses,
      remainingBalance: Number(remaining.toFixed(2)),
      drawdownPercent,
      requiredRecoveryPercent,
    };
  });
}
