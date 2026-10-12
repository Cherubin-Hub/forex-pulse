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

export function UserNav() {
  const [gatewayEmail, setGatewayEmail] = useState<string | null>(null);

  useEffect(() => {
    // Read the gateway session cookie if present
    const cookies = document.cookie.split("; ");
    const sessionCookie = cookies.find((c) => c.startsWith("fp_gateway_session="));
    if (sessionCookie) {
      try {
        const decoded = decodeURIComponent(sessionCookie.split("=")[1]);
        const data = JSON.parse(decoded) as { email?: string };
        if (data.email) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
          setGatewayEmail(data.email);
        }
      } catch {
        // Fallback
      }
    }
  }, []);

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
            window.location.href = "http://localhost:3000/portal";
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

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            // Clear gateway session cookie on logout
            document.cookie = "fp_gateway_session=; path=/; max-age=0;";
            await logout();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
