import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Federated Single Sign-Out (Global Logout) Endpoint for Forex Pulse.
 * Clears the fp_gateway_session cookie and redirects back to Pulse Gateway.
 */
export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "http://localhost:3000/login";

  let destination = "http://localhost:3000/login";
  try {
    const url = new URL(returnTo);
    destination = url.toString();
  } catch {
    destination = "http://localhost:3000/login";
  }

  const response = NextResponse.redirect(destination);

  // Expire and clear the Forex Pulse gateway session cookie
  response.cookies.delete("fp_gateway_session");
  response.cookies.set({
    name: "fp_gateway_session",
    value: "",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // Continue even if local Supabase signOut is already clear
  }

  return response;
}

export async function POST(request: NextRequest) {
  return GET(request);
}
