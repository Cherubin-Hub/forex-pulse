import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/sso/session";
import { gatewayBaseUrl } from "@/lib/redirects";
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // These endpoints perform their own secret or token verification.
  if (
    [
      "/api/auth/sso",
      "/api/auth/logout",
      "/api/cron/scan",
      "/api/feeds/ingest",
      "/login",
      "/manifest.webmanifest",
      "/manifest.json",
      "/favicon.ico",
    ].includes(pathname)
  )
    return NextResponse.next();
  const token = request.cookies.get("fp_gateway_session")?.value;
  const result = token ? await verifySessionToken(token) : { valid: false };
  if (result.valid) return NextResponse.next();
  if (pathname.startsWith("/api/"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const gateway = gatewayBaseUrl();
  if (!gateway)
    return NextResponse.json(
      {
        error:
          "NEXT_PUBLIC_GATEWAY_URL must be configured with your HTTPS Gateway origin.",
      },
      { status: 503 },
    );
  const destination = new URL("/login", gateway);
  destination.searchParams.set("app", "forex-pulse");
  destination.searchParams.set("returnTo", pathname + request.nextUrl.search);
  const response = NextResponse.redirect(destination);
  if (token) response.cookies.delete("fp_gateway_session");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)",
  ],
};
