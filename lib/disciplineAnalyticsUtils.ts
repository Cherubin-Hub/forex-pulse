import type { TradingSetup } from "@/types/setup";
import {
  type TradePostMortem,
  type ExecutionGrade,
  type PsychologicalState,
  type MistakeCategory,
  calculateRealizedR,
} from "@/lib/postMortemUtils";

export type GradeMetric = {
  grade: ExecutionGrade;
  count: number;
  winCount: number;
  lossCount: number;
  winRate: number; // 0% to 100%
  totalR: number;
  avgR: number;
};

export type PsychologyMetric = {
  state: PsychologicalState;
  count: number;
  winRate: number;
  totalR: number;
};

export type MistakeLeakage = {
  mistake: MistakeCategory;
  label: string;
  count: number;
  lostR: number; // Positive R amount lost
};

export type DisciplineEdgeSummary = {
  totalReviewed: number;
  gradeMetrics: GradeMetric[];
  psychologyMetrics: PsychologyMetric[];
  mistakeLeakages: MistakeLeakage[];
  totalPreventableLeakageR: number;
  disciplinedVsUndisciplinedEdgeR: number;
};

const MISTAKE_LABELS: Record<MistakeCategory, string> = {
  NONE: "None (Executed to Plan)",
  EARLY_ENTRY: "Early Entry (Chased)",
  LATE_CHASE: "Late Chase",
  MOVED_SL: "Moved Stop Loss (Widened)",
  PREMATURE_EXIT: "Premature Exit",
  OVERSIZED: "Oversized Position",
  NEWS_GAMBLE: "News Gamble",
  IGNORED_HTF_BIAS: "Ignored HTF Trend",
};

/**
 * Computes statistical performance breakdown across execution grades, mindsets, and mistake leakages.
 */
export function calculateDisciplineEdge(
  setups: TradingSetup[],
  reviews: Record<string, TradePostMortem>,
): DisciplineEdgeSummary {
  const resolved = setups.filter(
    (s) => s.status === "TP_REACHED" || s.status === "SL_HIT",
  );

  const gradeGroups: Record<
    ExecutionGrade,
    { wins: number; losses: number; r: number; count: number }
  > = {
    A: { wins: 0, losses: 0, r: 0, count: 0 },
    B: { wins: 0, losses: 0, r: 0, count: 0 },
    C: { wins: 0, losses: 0, r: 0, count: 0 },
    D: { wins: 0, losses: 0, r: 0, count: 0 },
    F: { wins: 0, losses: 0, r: 0, count: 0 },
  };

  const psychologyGroups: Record<
    string,
    { wins: number; losses: number; r: number; count: number }
  > = {};
  const mistakeGroups: Record<string, { lostR: number; count: number }> = {};

  let totalReviewed = 0;

  for (const s of resolved) {
    const rev = reviews[s.id];
    if (!rev) continue;

    totalReviewed += 1;
    const r = calculateRealizedR(s);
    const isWin = r > 0;
    const isLoss = r < 0;

    // 1. Execution Grade Grouping
    gradeGroups[rev.grade].count += 1;
    gradeGroups[rev.grade].r += r;
    if (isWin) gradeGroups[rev.grade].wins += 1;
    if (isLoss) gradeGroups[rev.grade].losses += 1;

    // 2. Psychology Grouping
    if (!psychologyGroups[rev.psychology]) {
      psychologyGroups[rev.psychology] = { wins: 0, losses: 0, r: 0, count: 0 };
    }
    psychologyGroups[rev.psychology].count += 1;
    psychologyGroups[rev.psychology].r += r;
    if (isWin) psychologyGroups[rev.psychology].wins += 1;
    if (isLoss) psychologyGroups[rev.psychology].losses += 1;

    // 3. Preventable Mistake Leakage
    if (rev.mistake !== "NONE") {
      if (!mistakeGroups[rev.mistake]) {
        mistakeGroups[rev.mistake] = { lostR: 0, count: 0 };
      }
      mistakeGroups[rev.mistake].count += 1;
      if (r < 0) {
        mistakeGroups[rev.mistake].lostR += Math.abs(r);
      }
    }
  }

  // Build Grade Metrics
  const gradeMetrics: GradeMetric[] = (
    ["A", "B", "C", "D", "F"] as ExecutionGrade[]
  ).map((grade) => {
    const data = gradeGroups[grade];
    const winRate =
      data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0;
    const avgR = data.count > 0 ? Number((data.r / data.count).toFixed(2)) : 0;

    return {
      grade,
      count: data.count,
      winCount: data.wins,
      lossCount: data.losses,
      winRate,
      totalR: Number(data.r.toFixed(1)),
      avgR,
    };
  });

  // Build Psychology Metrics
  const psychologyMetrics: PsychologyMetric[] = Object.entries(psychologyGroups)
    .map(([stateStr, data]) => {
      const state = stateStr as PsychologicalState;
      const winRate =
        data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0;

      return {
        state,
        count: data.count,
        winRate,
        totalR: Number(data.r.toFixed(1)),
      };
    })
    .sort((a, b) => b.totalR - a.totalR);

  // Build Mistake Leakages
  let totalPreventableLeakageR = 0;
  const mistakeLeakages: MistakeLeakage[] = Object.entries(mistakeGroups)
    .map(([mistakeStr, data]) => {
      const mistake = mistakeStr as MistakeCategory;
      totalPreventableLeakageR += data.lostR;

      return {
        mistake,
        label: MISTAKE_LABELS[mistake] ?? mistakeStr,
        count: data.count,
        lostR: Number(data.lostR.toFixed(1)),
      };
    })
    .sort((a, b) => b.lostR - a.lostR);

  // Calculate Edge: Grade A/B average vs Grade C/D/F average
  const goodR = gradeGroups.A.r + gradeGroups.B.r;
  const badR = gradeGroups.C.r + gradeGroups.D.r + gradeGroups.F.r;
  const disciplinedVsUndisciplinedEdgeR = Number((goodR - badR).toFixed(1));

  return {
    totalReviewed,
    gradeMetrics,
    psychologyMetrics,
    mistakeLeakages,
    totalPreventableLeakageR: Number(totalPreventableLeakageR.toFixed(1)),
    disciplinedVsUndisciplinedEdgeR,
  };
}
