import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { verifySSOToken } from "@/lib/sso/verifier";
import { signSessionPayload } from "@/lib/sso/session";
import { safeReturnPath } from "@/lib/redirects";
import { ensureGatewayIdentity } from "@/lib/services/gatewayIdentity";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const payloadBase64 = searchParams.get("payload");
  const signature = searchParams.get("sig");
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  if (!payloadBase64 || !signature) {
    return NextResponse.json(
      {
        error: "Missing required SSO parameters: payload and sig are required.",
      },
      { status: 400 },
    );
  }

  // 1. Verify cryptographic HMAC signature & ensure token is under 60 seconds old
  const result = verifySSOToken(payloadBase64, signature);

  if (!result.valid || !result.payload) {
    return NextResponse.json(
      { error: result.error ?? "Invalid SSO token." },
      { status: 401 },
    );
  }

  // 2. Provision or sync user identity in Forex Pulse Supabase instance (so foreign keys succeed)
  try {
    await ensureGatewayIdentity({
      userId: result.payload.userId,
      email: result.payload.email,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to provision your trading account.",
      },
      { status: 503 },
    );
  }

  // A unique database key consumes the nonce across all server instances.
  try {
    const admin = createAdminClient();
    const cleanup = await admin
      .from("gateway_sso_nonces")
      .delete()
      .lt("expires_at", new Date().toISOString());
    if (cleanup.error) throw new Error("SSO nonce storage unavailable.");
    const { error } = await admin.from("gateway_sso_nonces").insert({
      nonce_hash: createHash("sha256")
        .update(result.payload.nonce)
        .digest("hex"),
      expires_at: new Date(Date.now() + 120000).toISOString(),
    });
    if (error)
      return NextResponse.json(
        {
          error:
            error.code === "23505"
              ? "SSO token has already been used."
              : "SSO nonce storage unavailable.",
        },
        { status: error.code === "23505" ? 401 : 503 },
      );
  } catch {
    return NextResponse.json(
      { error: "SSO nonce storage unavailable. Apply the database migration." },
      { status: 503 },
    );
  }

  // 3. Prepare redirect response to the target dashboard or requested deep-link
  const sanitizedReturnTo = safeReturnPath(returnTo);
  const destinationUrl = new URL(sanitizedReturnTo, request.url);
  const response = NextResponse.redirect(destinationUrl);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");

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
      { status: 500 },
    );
  }
}
