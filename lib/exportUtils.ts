import type { TradingSetup } from "@/types/setup";

export type CumulativeRPoint = {
  tradeIndex: number;
  symbol: string;
  date: string;
  rReturn: number;
  cumulativeR: number;
};

/**
 * Computes running cumulative R-multiple performance points across resolved trades.
 */
export function calculateCumulativeRCurve(setups: TradingSetup[]): CumulativeRPoint[] {
  // 1. Filter to completed trades (Wins & Losses) and sort chronologically
  const completed = setups
    .filter((s) => s.status === "TP_REACHED" || s.status === "SL_HIT")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let runningR = 0;
  return completed.map((s, index) => {
    const rReturn = s.status === "TP_REACHED" ? Number(s.riskReward) : -1.0;
    runningR = Number((runningR + rReturn).toFixed(2));

    return {
      tradeIndex: index + 1,
      symbol: s.symbol,
      date: new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rReturn,
      cumulativeR: runningR,
    };
  });
}

/**
 * Formats setup records into standard CSV text and triggers browser file download.
 */
export function exportSetupsToCSV(setups: TradingSetup[]): void {
  const headers = [
    "Date Logged",
    "Symbol",
    "Direction",
    "Entry Min",
    "Entry Max",
    "Stop Loss",
    "Take Profit 1",
    "Risk Reward (RR)",
    "Status",
    "Invalidation Rule",
    "Confluence Tags",
    "Notes",
  ];

  const escapeCSV = (str: string | number | null | undefined) => {
    if (str === null || str === undefined) return '""';
    const clean = String(str).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = setups.map((s) => [
    escapeCSV(new Date(s.createdAt).toISOString().split("T")[0]),
    escapeCSV(s.symbol),
    escapeCSV(s.direction),
    escapeCSV(s.entryMin),
    escapeCSV(s.entryMax),
    escapeCSV(s.stopLoss),
    escapeCSV(s.takeProfit1),
    escapeCSV(`1:${s.riskReward.toFixed(1)}`),
    escapeCSV(s.status),
    escapeCSV(s.invalidationRule),
    escapeCSV(s.confluenceTags.join("; ")),
    escapeCSV(s.notes),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `forex-pulse-trade-journal-${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
