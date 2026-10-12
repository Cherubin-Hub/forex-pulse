export type AlertCondition =
  | "PRICE_ABOVE"
  | "PRICE_BELOW"
  | "PRICE_INSIDE_ZONE"
  | "PROXIMITY_PIPS"
  | "BREAKEVEN_REACHED";

export type AlertAction =
  | "NOTIFY"
  | "AUTO_TRIGGER"
  | "AUTO_BREAKEVEN";

export type AlertStatus = "ACTIVE" | "FIRED" | "DISMISSED";

export interface PriceAlert {
  id: string;
  setupId: string | null;
  symbol: string;
  condition: AlertCondition;
  targetPrice: number;
  proximityPips?: number;
  action: AlertAction;
  status: AlertStatus;
  message: string;
  createdAt: string;
  firedAt: string | null;
}

export interface FiredAlertResult {
  alert: PriceAlert;
  action: AlertAction;
  setupId: string | null;
  currentPrice: number;
  description: string;
}
