import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { GatewaySessionData } from "@/lib/sso/session";

/** Ensure the verified Gateway ID exists in this project's auth.users table. */
export async function ensureGatewayIdentity(
  identity: Pick<GatewaySessionData, "userId" | "email">,
): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error(
      "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required.",
    );
  }

  const admin = createAdminClient();
  const { data: existing, error: lookupError } =
    await admin.auth.admin.getUserById(identity.userId);

  if (!lookupError && existing.user?.id === identity.userId) {
    return;
  }

  if (lookupError && lookupError.status !== 404) {
    console.error("[SSO] Identity lookup failed:", lookupError.message);
    throw new Error("Unable to verify your trading account. Please retry.");
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      id: identity.userId,
      email: identity.email,
      email_confirm: true,
      user_metadata: { email: identity.email },
    });

  if (!createError && created.user?.id === identity.userId) {
    return;
  }

  // Another request may have provisioned the same ID concurrently.
  const { data: verified, error: verificationError } =
    await admin.auth.admin.getUserById(identity.userId);

  if (!verificationError && verified.user?.id === identity.userId) {
    return;
  }

  console.error(
    "[SSO] Identity provisioning failed:",
    createError?.message ?? verificationError?.message,
  );
  throw new Error(
    "Unable to provision your trading account. Check the server's Supabase " +
      "configuration and whether this email already belongs to another user ID.",
  );
}
