import type { TradingSetup } from "@/types/setup";
import { INSTRUMENTS } from "@/lib/constants/instruments";

export type ExecutionGrade = "A" | "B" | "C" | "D" | "F";

export type PsychologicalState =
  | "DISCIPLINED"
  | "CONFIDENT"
  | "NEUTRAL"
  | "ANXIOUS"
  | "FOMO"
  | "HESITANT"
  | "REVENGE";

export type MistakeCategory =
  | "NONE"
  | "EARLY_ENTRY"
  | "LATE_CHASE"
  | "MOVED_SL"
  | "PREMATURE_EXIT"
  | "OVERSIZED"
  | "NEWS_GAMBLE"
  | "IGNORED_HTF_BIAS";

export type TradePostMortem = {
  setupId: string;
  grade: ExecutionGrade;
  psychology: PsychologicalState;
  mistake: MistakeCategory;
  rulesFollowed: {
    planFollowed: boolean;
    riskManaged: boolean;
    stopHonored: boolean;
    targetPatient: boolean;
  };
  disciplineScore: number; // 0 to 100
  retrospectiveNotes: string;
  reviewedAt: string;
};

const STORAGE_KEY = "forex_pulse_post_mortems_v1";

/**
 * Calculates realized R-multiple based on resolution status.
 */
export function calculateRealizedR(setup: TradingSetup): number {
  if (setup.status === "TP_REACHED") return Number(setup.riskReward.toFixed(1));
  if (setup.status === "SL_HIT") return -1.0;
  return 0.0; // INVALIDATED or EXPIRED
}

/**
 * Calculates realized pip distance gained or lost upon trade resolution.
 */
export function calculateRealizedPips(setup: TradingSetup): number {
  const inst = INSTRUMENTS.find((i) => i.symbol === setup.symbol);
  const decimals = inst?.decimals ?? 5;
  const multiplier = decimals === 5 ? 10000 : decimals === 3 ? 100 : 10;
  const entryMid = (setup.entryMin + setup.entryMax) / 2;

  if (setup.status === "TP_REACHED") {
    return Number((Math.abs(setup.takeProfit1 - entryMid) * multiplier).toFixed(1));
  }
  if (setup.status === "SL_HIT") {
    return -Number((Math.abs(entryMid - setup.stopLoss) * multiplier).toFixed(1));
  }
  return 0.0;
}

/**
 * Formats elapsed holding time between trade creation and resolution.
 */
export function calculateTradeDuration(createdAt: string, updatedAt: string): string {
  const start = new Date(createdAt).getTime();
  const end = new Date(updatedAt).getTime();
  const diffMs = Math.max(0, end - start);

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;

  if (days > 0) return `${days}d ${remHours}h`;
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(diffMs / (1000 * 60));
  return `${minutes}m`;
}

/**
 * Computes a weighted 0-100% discipline score from the adherence checklist.
 */
export function calculateDisciplineScore(rules: TradePostMortem["rulesFollowed"]): number {
  let score = 0;
  if (rules.planFollowed) score += 30;
  if (rules.riskManaged) score += 30;
  if (rules.stopHonored) score += 25;
  if (rules.targetPatient) score += 15;
  return score;
}

export function getGradeBadgeColor(grade: ExecutionGrade): string {
  switch (grade) {
    case "A":
      return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
    case "B":
      return "bg-sky-500/15 text-sky-500 border-sky-500/30";
    case "C":
      return "bg-amber-500/15 text-amber-500 border-amber-500/30";
    case "D":
      return "bg-orange-500/15 text-orange-500 border-orange-500/30";
    case "F":
      return "bg-rose-500/15 text-rose-500 border-rose-500/30";
  }
}

/**
 * Loads all stored post-mortem reviews from localStorage.
 */
export function loadAllPostMortems(): Record<string, TradePostMortem> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Persists a post-mortem review for a specific trade setup.
 */
export function savePostMortem(review: TradePostMortem): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadAllPostMortems();
    existing[review.setupId] = review;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error("Failed to persist post-mortem review:", err);
  }
}
