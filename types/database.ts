import type { TradeDirection, SetupStatus } from "./setup";
import type { SessionType, MarketBias, VolatilityExpectation } from "./report";
import type { EventImpact } from "./calendar";
import type { NewsImpact } from "./news";
import type { DataStatus } from "./market";

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
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trading_setups"]["Insert"]>;
        Relationships: [];
      };
      session_reports: {
        Row: {
          id: string;
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
        Update: Partial<Database["public"]["Tables"]["session_reports"]["Insert"]>;
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
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Insert"]>;
        Relationships: [];
      };
      economic_events: {
        Row: {
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
        Update: Partial<Database["public"]["Tables"]["economic_events"]["Insert"]>;
        Relationships: [];
      };
      market_news: {
        Row: {
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
