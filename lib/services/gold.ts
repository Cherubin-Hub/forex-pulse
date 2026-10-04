import type { GoldDriver, KeyLevel } from "@/types/gold";
import { MOCK_GOLD_DRIVERS, MOCK_KEY_LEVELS } from "@/lib/mock/gold";

export async function getGoldDrivers(): Promise<GoldDriver[]> {
  return MOCK_GOLD_DRIVERS;
}

export async function getGoldKeyLevels(): Promise<KeyLevel[]> {
  return MOCK_KEY_LEVELS;
}
