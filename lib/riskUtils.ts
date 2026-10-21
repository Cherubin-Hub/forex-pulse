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
  marketPrice?: number;
  leverage?: number;
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
  actualRiskAmount: number;
  error?: string;
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
export function calculatePositionSize(
  params: PositionSizeParams,
): PositionSizeResult {
  const {
    balance,
    riskPercent,
    symbol,
    mode,
    slPips = 0,
    entryPrice = 0,
    stopLossPrice = 0,
    marketPrice = 0,
    leverage = 100,
  } = params;
  const empty: PositionSizeResult = {
    riskAmount: 0,
    lotSize: 0,
    miniLots: 0,
    microLots: 0,
    units: 0,
    effectiveSlPips: 0,
    pipValuePerLot: 0,
    estimatedMargin: 0,
    actualRiskAmount: 0,
  };
  const instrument = INSTRUMENTS.find((value) => value.symbol === symbol);
  if (
    !instrument ||
    ![balance, riskPercent, leverage].every(Number.isFinite) ||
    balance <= 0 ||
    riskPercent <= 0 ||
    riskPercent > 5 ||
    leverage < 1
  )
    return {
      ...empty,
      error: "Enter a positive balance and valid risk and leverage.",
    };
  const price = mode === "PRICE" ? entryPrice : marketPrice;
  if (!Number.isFinite(price) || price <= 0)
    return {
      ...empty,
      error: "A verified market price or a valid entry price is required.",
    };
  const pip =
    instrument.category === "COMMODITY"
      ? 0.1
      : instrument.quote === "JPY"
        ? 0.01
        : 0.0001;
  const distance =
    mode === "PRICE" ? Math.abs(entryPrice - stopLossPrice) / pip : slPips;
  if (
    !Number.isFinite(distance) ||
    distance <= 0 ||
    (mode === "PRICE" &&
      (!Number.isFinite(stopLossPrice) || stopLossPrice <= 0))
  )
    return { ...empty, error: "Stop distance must be greater than zero." };
  const contract = instrument.category === "COMMODITY" ? 100 : 100000;
  // All supported instruments have USD as base or quote. Account currency is USD.
  const pipValuePerLot =
    (contract * pip) / (instrument.base === "USD" ? price : 1);
  const riskAmount = (balance * riskPercent) / 100;
  const rawLots = riskAmount / (distance * pipValuePerLot);
  const lotSize = Math.floor(rawLots * 100) / 100;
  const units = lotSize * contract;
  const estimatedMargin =
    (units * (instrument.base === "USD" ? 1 : price)) / leverage;
  if (lotSize < 0.01)
    return {
      ...empty,
      riskAmount,
      error: "The minimum 0.01 lot would exceed your risk budget.",
    };
  if (estimatedMargin > balance)
    return {
      ...empty,
      riskAmount,
      error: "Required margin exceeds the configured account balance.",
    };
  return {
    riskAmount,
    lotSize,
    miniLots: lotSize * 10,
    microLots: lotSize * 100,
    units,
    effectiveSlPips: distance,
    pipValuePerLot,
    estimatedMargin,
    actualRiskAmount: lotSize * distance * pipValuePerLot,
  };
}

/**
 * Aggregates live open risk and directional currency exposures across active setups.
 */
export function calculatePortfolioExposure(
  setups: TradingSetup[],
  settings: UserSettings,
  balance: number,
): PortfolioRiskSummary {
  const active = setups.filter(
    (s) =>
      s.status === "WAITING_FOR_CONFIRMATION" || s.status === "ENTRY_TRIGGERED",
  );

  const openSetupsCount = active.length;
  const maxOpenSetups = settings.maxOpenSetups;
  const capacityPercent = Math.min(
    100,
    Math.round((openSetupsCount / maxOpenSetups) * 100),
  );

  const totalRiskPercent = Number(
    active
      .reduce(
        (sum, setup) =>
          sum + (setup.riskPercent ?? settings.riskPerTradePercent),
        0,
      )
      .toFixed(2),
  );
  const totalRiskAmount = Number(
    (balance * (totalRiskPercent / 100)).toFixed(2),
  );

  // Currency Net Exposure Map
  const currencyScores: Record<string, { net: number; symbols: Set<string> }> =
    {};

  for (const s of active) {
    const inst = INSTRUMENTS.find((i) => i.symbol === s.symbol);
    const base = inst?.base ?? s.symbol.slice(0, 3);
    const quote = inst?.quote ?? s.symbol.slice(3, 6);

    if (!currencyScores[base])
      currencyScores[base] = { net: 0, symbols: new Set() };
    if (!currencyScores[quote])
      currencyScores[quote] = { net: 0, symbols: new Set() };

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

  const currencyExposures: CurrencyNetExposure[] = Object.entries(
    currencyScores,
  )
    .filter(([, data]) => data.symbols.size > 0)
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
        `Correlated Exposure: ${Math.abs(exp.netScore)} setups are Net ${exp.netDirection} on ${exp.currency} (${exp.symbols.join(", ")}).`,
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
export function calculateDrawdownTable(
  balance: number,
  riskPercent: number,
): DrawdownStep[] {
  const steps = [1, 2, 3, 5, 8, 10];

  return steps.map((losses) => {
    const remaining = balance * Math.pow(1 - riskPercent / 100, losses);
    const drawdownPercent = Number(
      (((balance - remaining) / balance) * 100).toFixed(2),
    );
    const requiredRecoveryPercent = Number(
      (((balance - remaining) / remaining) * 100).toFixed(2),
    );

    return {
      losses,
      remainingBalance: Number(remaining.toFixed(2)),
      drawdownPercent,
      requiredRecoveryPercent,
    };
  });
}
