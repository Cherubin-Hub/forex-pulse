export interface GatewaySessionData {
  userId: string;
  email: string;
  authenticatedVia: string;
  issuedAt: number;
}

export interface SessionVerificationResult {
  valid: boolean;
  data?: GatewaySessionData;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function stringToBase64Url(str: string): string {
  const encoder = new TextEncoder();
  return bufferToBase64Url(encoder.encode(str).buffer as ArrayBuffer);
}

function base64UrlToString(base64Url: string): string {
  const buffer = base64UrlToArrayBuffer(base64Url);
  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(buffer));
}

/**
 * Signs a session payload using Web Crypto HMAC-SHA256.
 * Fully compatible with Vercel Edge Runtime, Cloudflare Workers, and Node.js.
 */
export async function signSessionPayload(data: GatewaySessionData): Promise<string> {
  const secret = process.env.CROSS_APP_SSO_SECRET;
  if (!secret) {
    throw new Error("CROSS_APP_SSO_SECRET is not configured on Forex Pulse.");
  }

  const payloadString = JSON.stringify(data);
  const payloadBase64 = stringToBase64Url(payloadString);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payloadBase64)
  );

  const signatureBase64 = bufferToBase64Url(signatureBuffer);
  return `${payloadBase64}.${signatureBase64}`;
}

/**
 * Validates that a session cookie was signed by CROSS_APP_SSO_SECRET
 * and has not expired (maximum 7-day lifespan).
 */
export async function verifySessionToken(token: string): Promise<SessionVerificationResult> {
  const secret = process.env.CROSS_APP_SSO_SECRET;
  if (!secret || !token) {
    return { valid: false };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false };
  }

  const [payloadBase64, signatureBase64] = parts;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBuffer = base64UrlToArrayBuffer(signatureBase64);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      encoder.encode(payloadBase64)
    );

    if (!isValid) {
      return { valid: false };
    }

    const payloadJson = base64UrlToString(payloadBase64);
    const data: GatewaySessionData = JSON.parse(payloadJson);

    // Enforce 7-day expiration (in milliseconds)
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (now - data.issuedAt > maxAgeMs) {
      return { valid: false };
    }

    return { valid: true, data };
  } catch {
    return { valid: false };
  }
}
