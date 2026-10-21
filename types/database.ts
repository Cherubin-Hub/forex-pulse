import type { TradeDirection, SetupStatus } from "./setup";
import type { SessionType, MarketBias, VolatilityExpectation } from "./report";
import type { EventImpact } from "./calendar";
import type { NewsImpact } from "./news";
import type { DataStatus } from "./market";
import type { TrendDirection } from "./technical";
import type { NotificationType, NotificationPriority } from "./notification";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      gateway_sso_nonces: {
        Row: { nonce_hash: string; expires_at: string };
        Insert: { nonce_hash: string; expires_at: string };
        Update: { expires_at?: string };
        Relationships: [];
      };
      feed_health: {
        Row: {
          feed: string;
          synced_at: string;
          coverage_from: string | null;
          coverage_until: string | null;
        };
        Insert: {
          feed: string;
          synced_at?: string;
          coverage_from?: string | null;
          coverage_until?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["feed_health"]["Insert"]>;
        Relationships: [];
      };
      trading_setups: {
        Row: {
          id: string;
          user_id: string | null;
          symbol: string;
          direction: TradeDirection;
          entry_min: number;
          entry_max: number;
          stop_loss: number;
          take_profit_1: number;
          take_profit_2: number | null;
          risk_reward: number;
          status: SetupStatus;
          invalidation_rule: string;
          notes: string | null;
          confluence_tags: string[];
          original_stop_loss: number | null;
          realized_r: number | null;
          closed_at: string | null;
          risk_percent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          symbol: string;
          direction: TradeDirection;
          entry_min: number;
          entry_max: number;
          stop_loss: number;
          take_profit_1: number;
          take_profit_2?: number | null;
          risk_reward: number;
          status: SetupStatus;
          invalidation_rule: string;
          notes?: string | null;
          confluence_tags?: string[];
          original_stop_loss?: number | null;
          realized_r?: number | null;
          closed_at?: string | null;
          risk_percent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["trading_setups"]["Insert"]
        >;
        Relationships: [];
      };
      session_reports: {
        Row: {
          id: string;
          owner_id: string | null;
          session_window: string | null;
          title: string;
          session: SessionType;
          timestamp: string;
          bias: MarketBias;
          volatility: VolatilityExpectation;
          executive_summary: string;
          macro_catalysts: string[];
          key_levels: Json;
          playbook: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          session_window?: string | null;
          title: string;
          session: SessionType;
          timestamp?: string;
          bias: MarketBias;
          volatility: VolatilityExpectation;
          executive_summary: string;
          macro_catalysts?: string[];
          key_levels?: Json;
          playbook?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["session_reports"]["Insert"]
        >;
        Relationships: [];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          trader_profile: string;
          risk_per_trade_percent: number;
          min_risk_reward: number;
          max_open_setups: number;
          session_focus: string[];
          news_sensitivity: string;
          account_balance: number;
          leverage: number;
          max_daily_loss_r: number;
          automation_enabled: boolean;
          manual_lockout_until: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trader_profile?: string;
          risk_per_trade_percent?: number;
          min_risk_reward?: number;
          max_open_setups?: number;
          session_focus?: string[];
          news_sensitivity?: string;
          account_balance?: number;
          leverage?: number;
          max_daily_loss_r?: number;
          automation_enabled?: boolean;
          manual_lockout_until?: string | null;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["user_settings"]["Insert"]
        >;
        Relationships: [];
      };
      economic_events: {
        Row: {
          data_source: string;
          verified_at: string | null;
          id: string;
          title: string;
          currency: string;
          impact: EventImpact;
          scheduled_at: string;
          forecast: string | null;
          previous: string | null;
          actual: string | null;
          source: string;
          status: DataStatus;
          created_at: string;
        };
        Insert: {
          data_source?: string;
          verified_at?: string | null;
          id: string;
          title: string;
          currency: string;
          impact: EventImpact;
          scheduled_at: string;
          forecast?: string | null;
          previous?: string | null;
          actual?: string | null;
          source?: string;
          status?: DataStatus;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["economic_events"]["Insert"]
        >;
        Relationships: [];
      };
      market_news: {
        Row: {
          data_source: string;
          verified_at: string | null;
          id: string;
          headline: string;
          summary: string;
          source: string;
          url: string | null;
          impact: NewsImpact;
          currencies: string[];
          published_at: string;
          created_at: string;
        };
        Insert: {
          data_source?: string;
          verified_at?: string | null;
          id: string;
          headline: string;
          summary: string;
          source: string;
          url?: string | null;
          impact: NewsImpact;
          currencies?: string[];
          published_at: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["market_news"]["Insert"]>;
        Relationships: [];
      };
      gold_drivers: {
        Row: {
          data_source: string;
          verified_at: string | null;
          id: string;
          name: string;
          value: string;
          change: number;
          correlation: "POSITIVE" | "NEGATIVE";
          impact: "BULLISH" | "BEARISH" | "NEUTRAL";
          created_at: string;
        };
        Insert: {
          data_source?: string;
          verified_at?: string | null;
          id?: string;
          name: string;
          value: string;
          change?: number;
          correlation: "POSITIVE" | "NEGATIVE";
          impact: "BULLISH" | "BEARISH" | "NEUTRAL";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gold_drivers"]["Insert"]>;
        Relationships: [];
      };
      gold_key_levels: {
        Row: {
          data_source: string;
          verified_at: string | null;
          id: string;
          price: number;
          type: "SUPPORT" | "RESISTANCE" | "PIVOT";
          strength: "STRONG" | "MODERATE" | "WEAK";
          notes: string | null;
          created_at: string;
        };
        Insert: {
          data_source?: string;
          verified_at?: string | null;
          id?: string;
          price: number;
          type: "SUPPORT" | "RESISTANCE" | "PIVOT";
          strength: "STRONG" | "MODERATE" | "WEAK";
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["gold_key_levels"]["Insert"]
        >;
        Relationships: [];
      };
      technical_analysis: {
        Row: {
          data_source: string;
          verified_at: string | null;
          id: string;
          symbol: string;
          timeframes: Json;
          overall_bias: TrendDirection;
          updated_at: string;
        };
        Insert: {
          data_source?: string;
          verified_at?: string | null;
          id?: string;
          symbol: string;
          timeframes: Json;
          overall_bias: TrendDirection;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["technical_analysis"]["Insert"]
        >;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string | null;
          type: NotificationType;
          priority: NotificationPriority;
          title: string;
          message: string;
          symbol: string | null;
          link_href: string | null;
          action_label: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          type: NotificationType;
          priority: NotificationPriority;
          title: string;
          message: string;
          symbol?: string | null;
          link_href?: string | null;
          action_label?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["notifications"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      ingest_macro_data: { Args: { payload: Json }; Returns: undefined };
    };
  };
}
