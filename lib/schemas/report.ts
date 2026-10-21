import { z } from "zod";
export const sessionTypeSchema = z.enum([
  "LONDON_OPEN",
  "NEW_YORK_OPEN",
  "ASIAN_WRAP",
]);
