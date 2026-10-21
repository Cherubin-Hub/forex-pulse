"use client";

import { logout } from "@/app/actions/authActions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Layers } from "lucide-react";
import { gatewayBaseUrl } from "@/lib/redirects";

export function UserNav({ email }: { email?: string }) {
  const gatewayEmail = email ?? null;

  const gatewayUrl = gatewayBaseUrl();

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
        <DropdownMenuGroup>
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
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {/* Gateway Hub Quick Switcher */}
        <DropdownMenuItem
          onClick={() => {
            window.location.href = gatewayUrl
              ? `${gatewayUrl}/portal`
              : "/settings";
          }}
        >
          <Layers className="mr-2 h-4 w-4 text-emerald-500" />
          <span>Switch App / Gateway</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
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
