import crypto from "crypto";

import { ssoPayloadSchema } from "@/lib/schemas/auth";
import type { VerificationResult } from "@/types/auth";
export type { SSOPayload, VerificationResult } from "@/types/auth";

/**
 * Validates a cross-application SSO token and its cryptographic HMAC signature.
 * Enforces a 60-second age limit. The callback consumes the nonce atomically.
 */
export function verifySSOToken(
  rawPayloadBase64: string,
  signature: string,
): VerificationResult {
  const secret = process.env.CROSS_APP_SSO_SECRET;

  if (!secret) {
    return {
      valid: false,
      error: "Server configuration error: CROSS_APP_SSO_SECRET is not set.",
    };
  }

  try {
    // 1. Recalculate the HMAC-SHA256 digest
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawPayloadBase64)
      .digest("hex");

    // 2. Perform constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return { valid: false, error: "Invalid cryptographic signature." };
    }

    // 3. Decode and parse the JSON payload
    const decodedJson = Buffer.from(rawPayloadBase64, "base64").toString(
      "utf-8",
    );
    const payload = ssoPayloadSchema.parse(JSON.parse(decodedJson));

    // 4. Validate time window (must be within 60 seconds of issuance)
    const now = Date.now();
    const tokenAgeMs = now - payload.timestamp;
    const maxAgeMs = 60 * 1000; // 60 seconds

    if (tokenAgeMs < -5000 || tokenAgeMs > maxAgeMs) {
      return {
        valid: false,
        error: "SSO Token has expired or timestamp is out of bounds.",
      };
    }

    return { valid: true, payload };
  } catch (err) {
    return {
      valid: false,
      error: `Failed to decode payload: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}
