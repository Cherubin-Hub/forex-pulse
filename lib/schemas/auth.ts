import { z } from "zod";
export const ssoPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  timestamp: z.number().finite(),
  nonce: z.string().min(16).max(256),
  appName: z.string().min(1).max(100),
});
