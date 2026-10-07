import type { Database } from "@/types/database";
import type { TradingSetup } from "@/types/setup";
import type { SessionReport, KeyLevelBrief } from "@/types/report";

type SetupRow = Database["public"]["Tables"]["trading_setups"]["Row"];
type ReportRow = Database["public"]["Tables"]["session_reports"]["Row"];

/**
 * Maps a Supabase snake_case setup row to our application's TradingSetup model.
 */
export function mapRowToSetup(row: SetupRow): TradingSetup {
  return {
    id: row.id,
    symbol: row.symbol,
    direction: row.direction,
    entryMin: Number(row.entry_min),
    entryMax: Number(row.entry_max),
    stopLoss: Number(row.stop_loss),
    takeProfit1: Number(row.take_profit_1),
    takeProfit2: row.take_profit_2 !== null ? Number(row.take_profit_2) : null,
    riskReward: Number(row.risk_reward),
    status: row.status,
    invalidationRule: row.invalidation_rule,
    notes: row.notes ?? "",
    confluenceTags: row.confluence_tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a Supabase snake_case report row to our application's SessionReport model.
 */
export function mapRowToReport(row: ReportRow): SessionReport {
  return {
    id: row.id,
    title: row.title,
    session: row.session,
    timestamp: row.timestamp,
    bias: row.bias,
    volatility: row.volatility,
    executiveSummary: row.executive_summary,
    macroCatalysts: row.macro_catalysts ?? [],
    keyLevels: (row.key_levels as unknown as KeyLevelBrief[]) ?? [],
    playbook: (row.playbook as unknown as SessionReport["playbook"]) ?? {
      focusPairs: [],
      riskRule: "",
      tradeOpportunities: [],
    },
  };
}
