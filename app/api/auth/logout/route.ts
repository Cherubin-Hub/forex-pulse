import { NextRequest, NextResponse } from "next/server";
import { gatewayBaseUrl } from "@/lib/redirects";
export async function GET(request: NextRequest) {
  const gateway = gatewayBaseUrl();
  const fallback = gateway
    ? new URL("/login", gateway)
    : new URL("/login", request.url);
  let destination = fallback;
  try {
    const proposed = new URL(
      request.nextUrl.searchParams.get("returnTo") ?? fallback.href,
      fallback,
    );
    if (
      proposed.origin === fallback.origin &&
      ["https:", "http:"].includes(proposed.protocol) &&
      !proposed.username &&
      !proposed.password
    )
      destination = proposed;
  } catch {
    /* Use the configured Gateway login. */
  }
  const response = NextResponse.redirect(destination, 303);
  response.cookies.set({
    name: "fp_gateway_session",
    value: "",
    path: "/",
    httpOnly: true,
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
export async function POST(request: NextRequest) {
  return GET(request);
}
