import { z } from "zod";
const prices = z.array(z.number().finite().positive()).min(1);
export const candleResponseSchema = z
  .object({
    s: z.literal("ok"),
    c: prices,
    h: prices,
    l: prices,
    o: prices,
    t: z.array(z.number().int().positive()).min(1),
  })
  .refine(
    (data) =>
      [data.h, data.l, data.o, data.t].every(
        (values) => values.length === data.c.length,
      ) &&
      data.t.every((time, index) => index === 0 || time > data.t[index - 1]) &&
      data.h.every(
        (high, index) =>
          high >= data.l[index] &&
          high >= data.c[index] &&
          high >= data.o[index],
      ) &&
      data.l.every(
        (low, index) => low <= data.c[index] && low <= data.o[index],
      ),
    "Invalid candle series",
  );
