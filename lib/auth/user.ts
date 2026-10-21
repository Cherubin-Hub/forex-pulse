import "server-only";
import { cookies } from "next/headers";
import { verifySessionToken, type GatewaySessionData } from "@/lib/sso/session";

/**
 * Server-side helper to retrieve the currently authenticated user
 * from the signed Pulse Gateway SSO session cookie.
 */
export async function getAuthenticatedUser(): Promise<GatewaySessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("fp_gateway_session")?.value;
    if (!token) return null;

    const result = await verifySessionToken(token);
    if (!result.valid || !result.data) return null;

    return result.data;
  } catch (err) {
    if ((err as { digest?: string })?.digest !== "DYNAMIC_SERVER_USAGE") {
      console.warn("[Auth] Failed to verify gateway user session:", err);
    }
    return null;
  }
}

/**
 * Returns the current authenticated user's unique UUID, or null if unauthenticated.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const user = await getAuthenticatedUser();
  return user?.userId ?? null;
}

export async function requireUserId(): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    throw new Error("Unauthorized. Please sign in through Pulse Gateway.");
  return userId;
}
