"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { normalizeBaseUrl } from "@/lib/sso/session";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const supabase = await createServerSupabaseClient();
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout(redirectToGateway = true) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  
  // Clear the gateway session cookie on the server
  const cookieStore = await cookies();
  cookieStore.delete("fp_gateway_session");

  revalidatePath("/", "layout");

  const rawGatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000";
  const gatewayUrl = normalizeBaseUrl(rawGatewayUrl, "http://localhost:3000");
  redirect(`${gatewayUrl}/login`);
}
