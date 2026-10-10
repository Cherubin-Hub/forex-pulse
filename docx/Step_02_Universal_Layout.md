# Step 2: Universal App Layout & Responsive Shell

## 🎯 Overview
In this step, we construct the universal dashboard shell. It features a collapsible desktop sidebar with Framer Motion layout transitions, a mobile drawer navigation menu, an animated route pill indicator, and a persistent application header.

---

### 1. Navigation Constants Single Source of Truth (`lib/constants/navigation.ts`)

Centralizes all sidebar and mobile navigation items, preventing route drift across components.

**File:** `lib/constants/navigation.ts`
```typescript
import {
  LayoutDashboard,
  CandlestickChart,
  Coins,
  LineChart,
  CalendarDays,
  Newspaper,
  Target,
  History,
  FileText,
  ShieldAlert,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Markets", href: "/markets", icon: CandlestickChart },
      { title: "Gold", href: "/gold", icon: Coins },
      { title: "Technical Analysis", href: "/technical", icon: LineChart },
    ],
  },
  {
    label: "Fundamentals",
    items: [
      { title: "Economic Calendar", href: "/calendar", icon: CalendarDays },
      { title: "News", href: "/news", icon: Newspaper },
    ],
  },
  {
    label: "Trading",
    items: [
      { title: "Setups", href: "/setups", icon: Target },
      { title: "Setup History", href: "/setups/history", icon: History },
      { title: "Reports", href: "/reports", icon: FileText },
      { title: "Risk Management", href: "/risk", icon: ShieldAlert },
    ],
  },
  {
    label: "System",
    items: [{ title: "Settings", href: "/settings", icon: Settings }],
  },
];
```

#### Why this was written this way:
- **Centralized Definition:** Adding a new page or reordering navigation only requires editing this single constant array.

---

### 2. Collapsible Desktop Sidebar (`components/layout/Sidebar.tsx`)

**File:** `components/layout/Sidebar.tsx`
```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ChevronsLeft } from "lucide-react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { cn } from "@/lib/utils";

const EXPANDED_WIDTH = 248;
const COLLAPSED_WIDTH = 72;

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex"
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Activity className="h-4 w-4" />
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="whitespace-nowrap text-base font-semibold tracking-tight"
            >
              ForexPulse
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <SidebarNav isCollapsed={isCollapsed} pillId="desktop-active-pill" />

      {/* Collapse button */}
      <div className="border-t border-border p-3">
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <ChevronsLeft
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-300",
              isCollapsed && "rotate-180"
            )}
          />
          {!isCollapsed && <span className="whitespace-nowrap">Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
```

#### Why this was written this way:
- **Framer Motion Width Transitions:** Animates between 248px and 72px without layout jank, keeping the icon visible even when collapsed.

---

### 3. Animated Navigation Links (`components/layout/SidebarNav.tsx`)

Features Framer Motion `layoutId` to slide an active highlight pill smoothly between links.

**File:** `components/layout/SidebarNav.tsx`
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NAV_SECTIONS } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  isCollapsed?: boolean;
  pillId: string;
  onNavigate?: () => void;
};

export function SidebarNav({ isCollapsed = false, pillId, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href;

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 py-4">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p
            className={cn(
              "mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-opacity",
              isCollapsed && "opacity-0"
            )}
          >
            {section.label}
          </p>

          <ul className="space-y-1">
            {section.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={isCollapsed ? item.title : undefined}
                    className={cn(
                      "relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                      active
                        ? "text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId={pillId}
                        className="absolute inset-0 rounded-md bg-sidebar-accent"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <Icon className="relative z-10 h-4 w-4 shrink-0" />
                    {!isCollapsed && (
                      <span className="relative z-10 whitespace-nowrap">{item.title}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
```

---

### 4. Application Header (`components/layout/Header.tsx`)

**File:** `components/layout/Header.tsx`
```tsx
"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { NAV_SECTIONS } from "@/lib/constants/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserNav } from "@/components/layout/UserNav";

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
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
```

---

### 5. Mobile Drawer Navigation (`components/layout/MobileSidebar.tsx`)

**File:** `components/layout/MobileSidebar.tsx`
```tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/SidebarNav";

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open menu"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-sidebar text-sidebar-foreground shadow-2xl md:hidden"
            >
              <div className="flex h-14 items-center justify-between border-b border-border px-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Activity className="h-4 w-4" />
                  </div>
                  <span className="text-base font-semibold tracking-tight">ForexPulse</span>
                </div>
                <button
                  onClick={close}
                  className="rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <SidebarNav pillId="mobile-active-pill" onNavigate={close} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
```

---

### 6. Dashboard Layout Shell (`app/(dashboard)/layout.tsx`)

**File:** `app/(dashboard)/layout.tsx`
```tsx
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

#### Why this was written this way:
- **`flex min-w-0`:** Critical flexbox layout rule preventing charts, tables, and TradingView iframes from expanding beyond the viewport width on smaller laptop screens.
