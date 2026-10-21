import { z } from "zod";
import { INSTRUMENTS } from "@/lib/constants/instruments";

export const createSetupSchema = z
  .object({
    symbol: z
      .string()
      .toUpperCase()
      .refine(
        (symbol) =>
          INSTRUMENTS.some((instrument) => instrument.symbol === symbol),
        "Select a supported instrument",
      ),
    direction: z.enum(["LONG", "SHORT"]),
    entryMin: z.number().positive("Must be greater than 0"),
    entryMax: z.number().positive("Must be greater than 0"),
    stopLoss: z.number().positive("Stop loss must be greater than 0"),
    takeProfit1: z.number().positive("Take profit must be greater than 0"),
    invalidationRule: z
      .string()
      .min(5, "Define a clear invalidation rule (e.g. H1 close beyond SL)")
      .max(1000),
    notes: z.string().max(5000).optional(),
    confluenceTags: z.string().max(2000).optional(), // Comma-separated in form, parsed to array
  })
  .refine((data) => data.entryMin <= data.entryMax, {
    message: "Entry minimum must not exceed maximum",
    path: ["entryMax"],
  })
  .refine(
    (data) => {
      if (data.direction === "LONG") {
        return (
          data.stopLoss < data.entryMin && data.takeProfit1 > data.entryMax
        );
      } else {
        return (
          data.stopLoss > data.entryMax && data.takeProfit1 < data.entryMin
        );
      }
    },
    {
      message:
        "Price levels invalid: For LONG, SL must be below entry and TP above. For SHORT, SL must be above entry and TP below.",
      path: ["stopLoss"],
    },
  );

export type CreateSetupFormData = z.infer<typeof createSetupSchema>;
