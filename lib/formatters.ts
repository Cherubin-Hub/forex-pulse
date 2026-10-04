export function formatPrice(value: number | null, decimals: number): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export type PriceChange = {
  absolute: number;
  percent: number;
  isPositive: boolean;
};

export function calculateChange(
  price: number | null,
  previousClose: number | null
): PriceChange | null {
  if (price === null || previousClose === null || previousClose === 0) return null;
  const absolute = price - previousClose;
  return {
    absolute,
    percent: (absolute / previousClose) * 100,
    isPositive: absolute >= 0,
  };
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

const PHT_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Manila",
});

export function formatTimePHT(isoString: string): string {
  return `${PHT_TIME_FORMATTER.format(new Date(isoString))} PHT`;
}
