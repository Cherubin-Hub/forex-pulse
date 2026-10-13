import { NextRequest, NextResponse } from "next/server";
import { verifySSOToken } from "@/lib/sso/verifier";
import { signSessionPayload } from "@/lib/sso/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const payloadBase64 = searchParams.get("payload");
  const signature = searchParams.get("sig");
  const returnTo = searchParams.get("returnTo") || "/";

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

  // 2. Prepare redirect response to the target dashboard or requested deep-link
  const sanitizedReturnTo = returnTo.startsWith("/") ? returnTo : "/";
  const destinationUrl = new URL(sanitizedReturnTo, request.url);
  const response = NextResponse.redirect(destinationUrl);

  // 3. Issue cryptographically signed tamper-proof session cookie
  const signedSession = await signSessionPayload({
    email: result.payload.email,
    userId: result.payload.userId,
    authenticatedVia: "pulse-gateway",
    issuedAt: Date.now(),
  });

  response.cookies.set({
    name: "fp_gateway_session",
    value: signedSession,
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7-day session
  });

  return response;
}
