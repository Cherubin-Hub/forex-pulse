import { NextRequest, NextResponse } from "next/server";
import { verifySSOToken } from "@/lib/sso/verifier";
import { signSessionPayload } from "@/lib/sso/session";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // 2. Provision or sync user identity in Forex Pulse Supabase instance (so foreign keys succeed)
  try {
    const admin = createAdminClient();
    await admin.auth.admin.createUser({
      id: result.payload.userId,
      email: result.payload.email,
      email_confirm: true,
      user_metadata: { email: result.payload.email },
    });
  } catch {
    // User already provisioned in auth.users, continue
  }

  // 3. Prepare redirect response to the target dashboard or requested deep-link
  const sanitizedReturnTo = returnTo.startsWith("/") ? returnTo : "/";
  const destinationUrl = new URL(sanitizedReturnTo, request.url);
  const response = NextResponse.redirect(destinationUrl);

  // 4. Issue cryptographically signed tamper-proof session cookie
  try {
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
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sign session." },
      { status: 500 }
    );
  }
}
