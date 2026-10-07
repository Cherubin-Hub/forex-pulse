import type { TradeDirection, SetupStatus } from "./setup";
import type { SessionType, MarketBias, VolatilityExpectation } from "./report";

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
        Insert: Omit<Database["public"]["Tables"]["trading_setups"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trading_setups"]["Insert"]>;
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
        Insert: Omit<Database["public"]["Tables"]["session_reports"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["session_reports"]["Insert"]>;
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          account_balance: number;
          risk_per_trade: number;
          max_daily_loss: number;
          min_risk_reward: number;
          high_impact_news_buffer: number;
          updated_at: string;
        };
        Insert: Database["public"]["Tables"]["user_settings"]["Row"];
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Insert"]>;
      };
    };
  };
}
