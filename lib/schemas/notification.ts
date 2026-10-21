import { z } from "zod";
import { safeReturnPath } from "@/lib/redirects";
export const notificationInputSchema = z.object({
  type: z.enum([
    "NEWS_RISK",
    "SETUP_STATUS",
    "SESSION_ALERT",
    "RISK_WARNING",
    "PRICE_SIGNAL",
  ]),
  priority: z.enum(["CRITICAL", "HIGH", "INFO"]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  symbol: z.string().max(12).optional(),
  linkHref: z
    .string()
    .refine(
      (value) => safeReturnPath(value, "") === value,
      "Only local links are allowed",
    )
    .optional(),
  actionLabel: z.string().max(60).optional(),
});
