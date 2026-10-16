import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/sso/session";

/**
 * Normalizes a base URL by removing accidental wrapping quotes,
 * trimming whitespace, ensuring the https:// or http:// protocol prefix,
 * and stripping any trailing slash.
 */
function normalizeBaseUrl(rawUrl?: string | null, fallback = "http://localhost:3000"): string {
  if (!rawUrl || typeof rawUrl !== "string") {
    return fallback;
  }
  let url = rawUrl.trim().replace(/^['"`]+|['"`]+$/g, "");
  if (!url) {
    return fallback;
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow static resources, webmanifest, and public SSO callback endpoint
  const isSSOEndpoint = pathname === "/api/auth/sso";
  const isDiagnosticSeed = pathname.startsWith("/api/seed");
  const isManifest =
    pathname === "/manifest.webmanifest" ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico";

  if (isSSOEndpoint || isDiagnosticSeed || isManifest) {
    return NextResponse.next();
  }

  // 2. Validate Gateway Session Cookie
  const gatewayCookie = request.cookies.get("fp_gateway_session")?.value;
  const sessionResult = gatewayCookie ? await verifySessionToken(gatewayCookie) : { valid: false };

  // 3. Unauthenticated access -> Redirect to Pulse Gateway Login
  if (!sessionResult.valid) {
    try {
      const rawGatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000";
      const gatewayUrl = normalizeBaseUrl(rawGatewayUrl, "http://localhost:3000");
      const redirectUrl = new URL("/login", gatewayUrl);
      redirectUrl.searchParams.set("app", "forex-pulse");

      if (pathname !== "/" && !pathname.startsWith("/login")) {
        redirectUrl.searchParams.set("returnTo", pathname);
      }

      const response = NextResponse.redirect(redirectUrl);
      if (gatewayCookie) {
        response.cookies.delete("fp_gateway_session");
      }
      return response;
    } catch (err) {
      console.error("Middleware Gateway redirect error:", err);
      // Fail-safe fallback: Redirect to local login route to avoid throwing 500 MIDDLEWARE_INVOCATION_FAILED
      const localFallback = new URL("/login", request.url);
      return NextResponse.redirect(localFallback);
    }
  }

  // 4. If already authenticated via Gateway and visiting /login, redirect to main dashboard
  if (pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)",
  ],
};
