import type { TradingSetup } from "@/types/setup";
import { MOCK_ACTIVE_SETUPS, MOCK_HISTORY_SETUPS } from "@/lib/mock/setups";

export async function getActiveSetups(): Promise<TradingSetup[]> {
  return MOCK_ACTIVE_SETUPS;
}

export async function getHistorySetups(): Promise<TradingSetup[]> {
  return MOCK_HISTORY_SETUPS;
}
