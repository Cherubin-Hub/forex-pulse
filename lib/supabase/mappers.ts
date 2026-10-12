import type { Database } from "@/types/database";
import type { TradingSetup } from "@/types/setup";
import type { SessionReport, KeyLevelBrief } from "@/types/report";
import type { EconomicEvent } from "@/types/calendar";
import type { NewsArticle } from "@/types/news";
import type { GoldDriver, KeyLevel } from "@/types/gold";
import type { TechnicalAnalysis, Timeframe, IndicatorData } from "@/types/technical";
import type { SystemNotification } from "@/types/notification";

type SetupRow = Database["public"]["Tables"]["trading_setups"]["Row"];
type ReportRow = Database["public"]["Tables"]["session_reports"]["Row"];
type EventRow = Database["public"]["Tables"]["economic_events"]["Row"];
type NewsRow = Database["public"]["Tables"]["market_news"]["Row"];
type GoldDriverRow = Database["public"]["Tables"]["gold_drivers"]["Row"];
type GoldKeyLevelRow = Database["public"]["Tables"]["gold_key_levels"]["Row"];
type TechnicalAnalysisRow = Database["public"]["Tables"]["technical_analysis"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

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

/**
 * Maps a Supabase snake_case gold driver row to our application's GoldDriver model.
 */
export function mapRowToGoldDriver(row: GoldDriverRow): GoldDriver {
  return {
    id: row.id,
    name: row.name,
    value: row.value,
    change: Number(row.change),
    correlation: row.correlation,
    impact: row.impact,
  };
}

/**
 * Maps a Supabase snake_case gold key level row to our application's KeyLevel model.
 */
export function mapRowToKeyLevel(row: GoldKeyLevelRow): KeyLevel {
  return {
    id: row.id,
    price: Number(row.price),
    type: row.type,
    strength: row.strength,
    notes: row.notes ?? undefined,
  };
}

/**
 * Maps a Supabase snake_case technical analysis row to our application's TechnicalAnalysis model.
 */
export function mapRowToTechnicalAnalysis(row: TechnicalAnalysisRow): TechnicalAnalysis {
  return {
    symbol: row.symbol,
    timeframes: (row.timeframes as unknown as Record<Timeframe, IndicatorData>) ?? {},
    overallBias: row.overall_bias,
  };
}

/**
 * Maps a Supabase snake_case notification row to our application's SystemNotification model.
 */
export function mapRowToNotification(row: NotificationRow): SystemNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    priority: row.priority,
    title: row.title,
    message: row.message,
    symbol: row.symbol ?? undefined,
    linkHref: row.link_href ?? undefined,
    actionLabel: row.action_label ?? undefined,
    read: row.read,
    timestamp: row.created_at,
  };
}
