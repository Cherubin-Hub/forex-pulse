import { z } from "zod";
const metadata = {
  observedAt: z
    .string()
    .datetime({ offset: true })
    .refine(
      (value) =>
        Date.parse(value) <= Date.now() + 5000 &&
        Date.now() - Date.parse(value) < 3600000,
      "Feed observation must be less than an hour old",
    ),
  source: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("https://"),
      "An HTTPS source is required",
    ),
};
const event = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  currency: z.enum(["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"]),
  impact: z.enum(["HIGH", "MEDIUM", "LOW"]),
  scheduled_at: z.string().datetime({ offset: true }),
  forecast: z.string().nullable(),
  previous: z.string().nullable(),
  actual: z.string().nullable(),
});
const news = z.object({
  id: z.string().min(1).max(200),
  headline: z.string().min(1).max(1000),
  summary: z.string().max(10000),
  url: z.string().url().startsWith("https://"),
  impact: z.enum(["HIGH", "MEDIUM", "LOW"]),
  currencies: z.array(z.string().length(3)).max(10),
  published_at: z.string().datetime({ offset: true }),
});
const driver = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  value: z.string().max(100),
  change: z.number().finite(),
  correlation: z.enum(["POSITIVE", "NEGATIVE"]),
  impact: z.enum(["BULLISH", "BEARISH", "NEUTRAL"]),
});
const level = z.object({
  id: z.string().uuid(),
  price: z.number().finite().positive(),
  type: z.enum(["SUPPORT", "RESISTANCE", "PIVOT"]),
  strength: z.enum(["STRONG", "MODERATE", "WEAK"]),
  notes: z.string().max(1000).nullable(),
});
export const macroIngestionSchema = z.discriminatedUnion("feed", [
  z
    .object({
      ...metadata,
      feed: z.literal("calendar"),
      coverageFrom: z.string().datetime({ offset: true }),
      coverageUntil: z.string().datetime({ offset: true }),
      records: z.array(event).max(5000),
    })
    .refine(
      (value) =>
        Date.parse(value.coverageFrom) <= Date.now() - 3600000 &&
        Date.parse(value.coverageUntil) >= Date.now() + 3600000 &&
        value.records.every(
          (record) =>
            Date.parse(record.scheduled_at) >= Date.parse(value.coverageFrom) &&
            Date.parse(record.scheduled_at) <= Date.parse(value.coverageUntil),
        ),
      "Calendar coverage must include at least one hour before and after now",
    ),
  z.object({
    ...metadata,
    feed: z.literal("news"),
    records: z.array(news).max(1000),
  }),
  z.object({
    ...metadata,
    feed: z.literal("gold_drivers"),
    records: z.array(driver).max(100),
  }),
  z.object({
    ...metadata,
    feed: z.literal("gold_key_levels"),
    records: z.array(level).max(100),
  }),
]);
