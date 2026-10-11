import { z } from "zod";

export const tradeWebhookSchema = z.object({
  action: z.enum(["OPEN", "MODIFY", "CLOSE"]),
  ticket: z.string().min(1, "Ticket or Order ID is required"),
  symbol: z.string().min(3).max(10).transform((s) => s.replace("/", "").toUpperCase()),
  direction: z.enum(["LONG", "SHORT"]),
  price: z.number().positive("Entry price must be positive"),
  stopLoss: z.number().positive("Stop loss must be positive"),
  takeProfit: z.number().positive("Take profit must be positive"),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  closePrice: z.number().positive().optional(),
});

export type TradeWebhookPayload = z.infer<typeof tradeWebhookSchema>;
