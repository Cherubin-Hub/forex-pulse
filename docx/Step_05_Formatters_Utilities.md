# Step 5: Centralized Formatting & Helper Utilities

## 🎯 Overview
In this step, we build the centralized formatting utility layer. Financial dashboards require uniform decimal precision (e.g. 5 decimals for EUR/USD, 3 decimals for USD/JPY), percentage calculations, duration countdowns, and Philippine Standard Time (PHT) conversions. This module prohibits ad-hoc inline mutations across UI components.

---

### 1. Full Formatters Utility Module (`lib/formatters.ts`)

**File:** `lib/formatters.ts`
```typescript
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
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Manila",
});

const PHT_CLOCK_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZone: "Asia/Manila",
});

/** "3:00 PM" — no suffix, for compact ranges */
export function formatClockPHT(value: string | Date, withSeconds = false): string {
  const formatter = withSeconds ? PHT_CLOCK_FORMATTER : PHT_TIME_FORMATTER;
  return formatter.format(new Date(value));
}

/** "3:00 PM PHT" */
export function formatTimePHT(value: string | Date): string {
  return `${formatClockPHT(value)} PHT`;
}

/** 93784000 -> "1d 2h 03m" · 7384000 -> "2h 03m 04s" · 184000 -> "3m 04s" */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  if (days > 0) return `${days}d ${hours}h ${pad(minutes)}m`;
  if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  return `${minutes}m ${pad(seconds)}s`;
}

// "en-CA" formats dates as YYYY-MM-DD — perfect for grouping keys.
const PHT_DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Manila",
});

const PHT_DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  timeZone: "Asia/Manila",
});

/** "2026-10-09" */
export function formatDayKeyPHT(value: string | Date): string {
  return PHT_DAY_KEY_FORMATTER.format(new Date(value));
}

/** "Friday, Oct 9" */
export function formatDayLabelPHT(value: string | Date): string {
  return PHT_DAY_LABEL_FORMATTER.format(new Date(value));
}
```

#### Why this was written this way:
- **`formatPrice` Explicit Decimals:** Currencies have differing fractional conventions. Passing `decimals` explicitly prevents `1.08000` from being truncated to `1.08`.
- **Pre-Instantiated `Intl.DateTimeFormat`:** Instantiating `Intl` formatters inside render loops creates garbage collection pressure. Defining top-level instances optimizes formatting performance.
- **`en-CA` ISO Key Generation:** `formatDayKeyPHT` uses Canadian English locale formatting to produce reliable `YYYY-MM-DD` strings for grouping calendar events by day.
