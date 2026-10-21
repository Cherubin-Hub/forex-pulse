import { redirect } from "next/navigation";
import { gatewayBaseUrl } from "@/lib/redirects";
export default function LoginPage() {
  const gateway = gatewayBaseUrl();
  if (!gateway)
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1>Gateway configuration required</h1>
        <p>
          Configure NEXT_PUBLIC_GATEWAY_URL with your Gateway HTTPS origin and
          redeploy.
        </p>
      </main>
    );
  redirect(`${gateway}/login?app=forex-pulse`);
}
