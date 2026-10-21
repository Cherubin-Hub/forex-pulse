"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { gatewayBaseUrl } from "@/lib/redirects";
export async function login(_formData: FormData) {
  void _formData;
  return { error: "Please sign in through Pulse Gateway." };
}
export async function logout(redirectToGateway = true) {
  const cookieStore = await cookies();
  cookieStore.delete("fp_gateway_session");
  revalidatePath("/", "layout");
  const gateway = gatewayBaseUrl();
  if (redirectToGateway && gateway)
    redirect(
      `${gateway}/api/auth/logout?returnTo=${encodeURIComponent(`${gateway}/login`)}`,
    );
  redirect("/login");
}
