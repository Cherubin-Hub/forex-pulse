import { z } from "zod";
export const scannerConfigSchema = z.object({
  minConfluenceScore: z.number().min(0).max(100).optional(),
  minRiskReward: z.number().min(1).max(10).optional(),
});
export const scannedOpportunitySchema = z.object({
  symbol: z.string(),
  direction: z.enum(["LONG", "SHORT"]),
  entryMin: z.number(),
  entryMax: z.number(),
  stopLoss: z.number(),
  takeProfit1: z.number(),
  invalidationRule: z.string(),
  notes: z.string(),
  confluenceTags: z.array(z.string()).max(30),
  detectedAt: z
    .string()
    .datetime()
    .refine((value) => Date.parse(value) <= Date.now() + 5000),
});
