import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/sso/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow static resources and public SSO callback endpoint
  const isSSOEndpoint = pathname === "/api/auth/sso";
  const isDiagnosticSeed = pathname.startsWith("/api/seed");

  if (isSSOEndpoint || isDiagnosticSeed) {
    return NextResponse.next();
  }

  // 2. Validate Gateway Session Cookie
  const gatewayCookie = request.cookies.get("fp_gateway_session")?.value;
  const sessionResult = gatewayCookie ? await verifySessionToken(gatewayCookie) : { valid: false };

  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000";

  // 3. Unauthenticated access -> Redirect to Pulse Gateway Login
  if (!sessionResult.valid) {
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
