import { NextRequest, NextResponse } from "next/server";
import { verifySSOToken } from "@/lib/sso/verifier";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const payloadBase64 = searchParams.get("payload");
  const signature = searchParams.get("sig");

  if (!payloadBase64 || !signature) {
    return NextResponse.json(
      { error: "Missing required SSO parameters: payload and sig are required." },
      { status: 400 }
    );
  }

  // 1. Verify cryptographic HMAC signature & ensure token is under 60 seconds old
  const result = verifySSOToken(payloadBase64, signature);

  if (!result.valid || !result.payload) {
    return NextResponse.json(
      { error: result.error ?? "Invalid SSO token." },
      { status: 401 }
    );
  }

  // 2. Prepare redirect response to the main dashboard
  const destinationUrl = new URL("/", request.url);
  const response = NextResponse.redirect(destinationUrl);

  // 3. Issue the authenticated session cookie
  response.cookies.set({
    name: "fp_gateway_session",
    value: JSON.stringify({
      email: result.payload.email,
      userId: result.payload.userId,
      authenticatedVia: "pulse-gateway",
      issuedAt: result.payload.timestamp,
    }),
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7-day session
  });

  return response;
}
