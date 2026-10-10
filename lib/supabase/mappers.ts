import type { Database } from "@/types/database";
import type { TradingSetup } from "@/types/setup";
import type { SessionReport, KeyLevelBrief } from "@/types/report";
import type { EconomicEvent } from "@/types/calendar";
import type { NewsArticle } from "@/types/news";

type SetupRow = Database["public"]["Tables"]["trading_setups"]["Row"];
type ReportRow = Database["public"]["Tables"]["session_reports"]["Row"];
type EventRow = Database["public"]["Tables"]["economic_events"]["Row"];
type NewsRow = Database["public"]["Tables"]["market_news"]["Row"];

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

/**
 * Maps a Supabase snake_case event row to our application's EconomicEvent model.
 */
export function mapRowToEvent(row: EventRow): EconomicEvent {
  return {
    id: row.id,
    title: row.title,
    currency: row.currency,
    impact: row.impact,
    scheduledAt: row.scheduled_at,
    forecast: row.forecast,
    previous: row.previous,
    actual: row.actual,
    source: row.source,
    status: row.status,
  };
}

/**
 * Maps a Supabase snake_case news row to our application's NewsArticle model.
 */
export function mapRowToNews(row: NewsRow): NewsArticle {
  return {
    id: row.id,
    headline: row.headline,
    summary: row.summary,
    source: row.source,
    url: row.url ?? undefined,
    impact: row.impact,
    currencies: row.currencies ?? [],
    publishedAt: row.published_at,
  };
}
