"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { NAV_SECTIONS } from "@/lib/constants/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserNav } from "@/components/layout/UserNav";
import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown";
import { CommandPalette } from "@/components/command/CommandPalette";

function getPageTitle(pathname: string): string {
  const allItems = NAV_SECTIONS.flatMap((section) => section.items);
  const match = allItems.find((item) => item.href === pathname);
  return match?.title ?? "ForexPulse";
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Global Ctrl+K / Cmd+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-2">
          <MobileSidebar />
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        </div>

        {/* Global Quick Search Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search pairs, actions...</span>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono font-medium">
              ⌘K
            </kbd>
          </button>

          {/* Dynamic Notification Dispatch */}
          <NotificationsDropdown />
          <ThemeToggle />
          <UserNav />
        </div>
      </header>

      {/* Global Command Palette Dialog */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </>
  );
}
