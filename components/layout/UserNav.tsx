"use client";

import { useEffect, useState } from "react";
import { logout } from "@/app/actions/authActions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Layers } from "lucide-react";
import { normalizeBaseUrl } from "@/lib/sso/session";

export function UserNav() {
  const [gatewayEmail, setGatewayEmail] = useState<string | null>(null);

  useEffect(() => {
    // Read the gateway session cookie if present
    const cookies = document.cookie.split("; ");
    const sessionCookie = cookies.find((c) => c.startsWith("fp_gateway_session="));
    if (sessionCookie) {
      try {
        const rawValue = decodeURIComponent(sessionCookie.split("=")[1] || "");
        let jsonStr = "";
        if (rawValue.includes(".")) {
          // New signed format: base64urlPayload.signature
          const base64Url = rawValue.split(".")[0];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          jsonStr = atob(base64);
        } else {
          // Legacy plain JSON
          jsonStr = rawValue;
        }

        const data = JSON.parse(jsonStr) as { email?: string };
        if (data.email) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
          setGatewayEmail(data.email);
        }
      } catch {
        // Fallback
      }
    }
  }, []);

  const rawGatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000";
  const gatewayUrl = normalizeBaseUrl(rawGatewayUrl, "http://localhost:3000");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {gatewayEmail ? gatewayEmail.slice(0, 2).toUpperCase() : "FP"}
          </Button>
        }
      />
      <DropdownMenuContent className="w-60" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {gatewayEmail ? gatewayEmail.split("@")[0] : "Forex Trader"}
            </p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {gatewayEmail ? gatewayEmail : "Active Session"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Gateway Hub Quick Switcher */}
        <DropdownMenuItem
          onClick={() => {
            window.location.href = `${gatewayUrl}/portal`;
          }}
        >
          <Layers className="mr-2 h-4 w-4 text-emerald-500" />
          <span>Switch App / Gateway</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            // Clear gateway session cookie on logout and redirect to Gateway Login
            document.cookie = "fp_gateway_session=; path=/; max-age=0;";
            await logout(true);
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out of Hub</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
