"use client";

import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/constants/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserNav } from "@/components/layout/UserNav";
import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown";

function getPageTitle(pathname: string): string {
  const allItems = NAV_SECTIONS.flatMap((section) => section.items);
  const match = allItems.find((item) => item.href === pathname);
  return match?.title ?? "ForexPulse";
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebar />
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {/* Dynamic Notification Dispatch */}
        <NotificationsDropdown />
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
