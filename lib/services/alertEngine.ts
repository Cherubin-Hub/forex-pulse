import type { PriceAlert, FiredAlertResult } from "@/types/alert";
import type { PriceQuote } from "@/types/market";
import type { TradingSetup } from "@/types/setup";
import { calculatePendingTradeProximity, calculateActiveTradeMetrics } from "@/lib/tradeProgressUtils";

const ALERTS_STORAGE_KEY = "fp_price_alerts_v1";

/**
 * Loads user alerts from LocalStorage (with SSR hydration safety).
 */
export function getSavedAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PriceAlert[]) : [];
  } catch (err) {
    console.error("[AlertEngine] Failed to read alerts from localStorage:", err);
    return [];
  }
}

/**
 * Persists user alerts to LocalStorage.
 */
export function saveAlerts(alerts: PriceAlert[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  } catch (err) {
    console.error("[AlertEngine] Failed to save alerts to localStorage:", err);
  }
}

/**
 * Evaluates active custom alerts and trade setups against current quotes.
 * Returns newly fired alerts and their required actions.
 */
export function evaluateSignalsAndAlerts(
  alerts: PriceAlert[],
  quotes: PriceQuote[],
  setups: TradingSetup[]
): {
  firedResults: FiredAlertResult[];
  updatedAlerts: PriceAlert[];
} {
  const firedResults: FiredAlertResult[] = [];
  const updatedAlerts = alerts.map((alert) => {
    if (alert.status !== "ACTIVE") return alert;

    const quote = quotes.find((q) => q.symbol === alert.symbol);
    if (!quote || quote.price === null) return alert;

    const currentPrice = quote.price;
    let isFired = false;
    let description = "";

    switch (alert.condition) {
      case "PRICE_ABOVE":
        if (currentPrice >= alert.targetPrice) {
          isFired = true;
          description = `${alert.symbol} surged above ${alert.targetPrice.toFixed(4)} (Current: ${currentPrice.toFixed(4)})`;
        }
        break;

      case "PRICE_BELOW":
        if (currentPrice <= alert.targetPrice) {
          isFired = true;
          description = `${alert.symbol} dropped below ${alert.targetPrice.toFixed(4)} (Current: ${currentPrice.toFixed(4)})`;
        }
        break;

      case "PRICE_INSIDE_ZONE": {
        const setup = setups.find((s) => s.id === alert.setupId);
        if (setup) {
          const prox = calculatePendingTradeProximity(setup, quote);
          if (prox?.isInsideZone) {
            isFired = true;
            description = `${alert.symbol} price has entered entry zone [${setup.entryMin} - ${setup.entryMax}].`;
          }
        }
        break;
      }

      case "BREAKEVEN_REACHED": {
        const setup = setups.find((s) => s.id === alert.setupId);
        if (setup) {
          const metrics = calculateActiveTradeMetrics(setup, quote);
          if (metrics && metrics.floatingR >= 1.0) {
            isFired = true;
            description = `${alert.symbol} reached +${metrics.floatingR.toFixed(1)}R. Breakeven rule satisfied.`;
          }
        }
        break;
      }
    }

    if (isFired) {
      const firedAlert: PriceAlert = {
        ...alert,
        status: "FIRED",
        firedAt: new Date().toISOString(),
      };
      firedResults.push({
        alert: firedAlert,
        action: alert.action,
        setupId: alert.setupId,
        currentPrice,
        description,
      });
      return firedAlert;
    }

    return alert;
  });

  return { firedResults, updatedAlerts };
}
