# Step 40: Institutional Command Palette & Global Quick Search (Ctrl+K)

## 🎯 Objective
Empower traders with keyboard-driven speed and institutional terminal workflows across Forex Pulse. This step delivers:
1. **Global Search Index Engine (`lib/commandUtils.ts`):** Indexing all 8 core currency pairs, all 10 application routes, active trade setups, and instant terminal actions (Log Setup, Export CSV, Generate Report, Theme Toggle).
2. **Keyboard-Driven Command Palette Modal (`components/command/CommandPalette.tsx`):** A zero-dependency modal triggered via `Ctrl + K` or `⌘K` featuring fuzzy search, keyboard navigation (`↑`, `↓`, `Enter`, `Escape`), category grouping, and action execution.
3. **Universal Header Search Affordance (`components/layout/Header.tsx`):** A sleek search pill with `⌘K` badge giving traders instant click and keyboard access from any page.

---

## 🛠 Step-by-Step Implementation

### 1. Create Command Indexing Utilities (`lib/commandUtils.ts`)
Define searchable command items, categories, and query matching logic with strict `LucideIcon` typing.

**File:** `lib/commandUtils.ts`
```typescript
import {
  PlusCircle,
  Download,
  FileText,
  SunMoon,
  TrendingUp,
  Target,
  type LucideIcon,
} from "lucide-react";
import { INSTRUMENTS } from "@/lib/constants/instruments";
import { NAV_SECTIONS } from "@/lib/constants/navigation";
import type { TradingSetup } from "@/types/setup";

export type CommandCategory = "ACTIONS" | "INSTRUMENTS" | "NAVIGATION" | "SETUPS";

export type CommandActionKey = "LOG_SETUP" | "EXPORT_CSV" | "GENERATE_REPORT" | "TOGGLE_THEME";

export type CommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  category: CommandCategory;
  icon: LucideIcon;
  href?: string;
  actionKey?: CommandActionKey;
  badge?: string;
  keywords: string[];
};

/**
 * Builds the searchable master catalog of terminal commands, navigation paths, and instruments.
 */
export function buildMasterCommandList(setups: TradingSetup[] = []): CommandItem[] {
  const items: CommandItem[] = [];

  // 1. Quick Execution Actions
  items.push(
    {
      id: "act-log-setup",
      title: "Log New Trade Setup",
      subtitle: "Open trade creation modal with risk calculations",
      category: "ACTIONS",
      icon: PlusCircle,
      href: "/setups",
      actionKey: "LOG_SETUP",
      keywords: ["new", "trade", "setup", "create", "entry", "order"],
    },
    {
      id: "act-export-csv",
      title: "Export Trade Journal (CSV)",
      subtitle: "Download all resolved trade records for analysis",
      category: "ACTIONS",
      icon: Download,
      actionKey: "EXPORT_CSV",
      keywords: ["export", "csv", "download", "journal", "backup", "excel"],
    },
    {
      id: "act-gen-report",
      title: "Generate AI Session Report",
      subtitle: "Synthesize macro catalysts, sentiment, and playbooks",
      category: "ACTIONS",
      icon: FileText,
      href: "/reports",
      actionKey: "GENERATE_REPORT",
      keywords: ["ai", "report", "session", "briefing", "summary"],
    },
    {
      id: "act-toggle-theme",
      title: "Toggle Light / Dark Mode",
      subtitle: "Switch dashboard appearance theme",
      category: "ACTIONS",
      icon: SunMoon,
      actionKey: "TOGGLE_THEME",
      keywords: ["theme", "dark", "light", "mode", "color"],
    }
  );

  // 2. Core Instruments & Charts
  for (const inst of INSTRUMENTS) {
    items.push({
      id: `inst-${inst.symbol}`,
      title: `${inst.displayName} (${inst.symbol})`,
      subtitle: `${inst.category} • Multi-timeframe trend & TradingView chart`,
      category: "INSTRUMENTS",
      icon: TrendingUp,
      href: `/technical`,
      badge: inst.category,
      keywords: [inst.symbol, inst.displayName, inst.base, inst.quote, "chart", "technical"],
    });
  }

  // 3. Navigation Routes
  for (const section of NAV_SECTIONS) {
    for (const nav of section.items) {
      items.push({
        id: `nav-${nav.href}`,
        title: nav.title,
        subtitle: `Navigate to ${nav.title} hub`,
        category: "NAVIGATION",
        icon: nav.icon,
        href: nav.href,
        keywords: [nav.title, nav.href, "page", "view", "go"],
      });
    }
  }

  // 4. Active Setups
  for (const s of setups) {
    items.push({
      id: `setup-${s.id}`,
      title: `${s.symbol} ${s.direction} (${s.status})`,
      subtitle: `Target RR 1:${s.riskReward.toFixed(1)} • Confluences: ${s.confluenceTags.join(", ")}`,
      category: "SETUPS",
      icon: Target,
      href: "/setups",
      badge: s.direction,
      keywords: [s.symbol, s.direction, s.status, ...s.confluenceTags],
    });
  }

  return items;
}

/**
 * Searches and filters commands by keyword matching across title, subtitle, and category.
 */
export function searchCommands(
  items: CommandItem[],
  query: string
): Record<CommandCategory, CommandItem[]> {
  const cleanQuery = query.toLowerCase().trim();

  const filtered = cleanQuery === ""
    ? items
    : items.filter((item) => {
        return (
          item.title.toLowerCase().includes(cleanQuery) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(cleanQuery)) ||
          item.keywords.some((k) => k.toLowerCase().includes(cleanQuery))
        );
      });

  const grouped: Record<CommandCategory, CommandItem[]> = {
    ACTIONS: [],
    INSTRUMENTS: [],
    NAVIGATION: [],
    SETUPS: [],
  };

  for (const item of filtered) {
    grouped[item.category].push(item);
  }

  return grouped;
}
```

#### Why this was written this way:
- **Strict `LucideIcon` Typing:** Replaces loose string icon identifiers with native `LucideIcon` component types, ensuring seamless type compatibility with `NAV_SECTIONS` and direct rendering in React JSX without fragile switch statements.
- **Unified Master Search:** Combines page routes, instruments, and active trades into a single lookup table, avoiding multiple disconnected search inputs.
- **Action Dispatch Keys:** Distinct `actionKey` mappings allow the palette to execute stateful functions (like downloading CSV or toggling themes) in addition to URL navigation.

---

### 2. Create Command Palette Modal (`components/command/CommandPalette.tsx`)
Create a keyboard-navigable modal with category dividers, arrow key selection, and shortcut hints.

**File:** `components/command/CommandPalette.tsx`
```tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Search, ArrowRight } from "lucide-react";
import type { TradingSetup } from "@/types/setup";
import {
  buildMasterCommandList,
  searchCommands,
  type CommandItem,
  type CommandCategory,
} from "@/lib/commandUtils";
import { exportSetupsToCSV } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setups?: TradingSetup[];
}

export function CommandPalette({ isOpen, onClose, setups = [] }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const masterList = useMemo(() => buildMasterCommandList(setups), [setups]);
  const grouped = useMemo(() => searchCommands(masterList, query), [masterList, query]);

  // Flattened visible items for arrow navigation
  const flatItems: CommandItem[] = useMemo(() => {
    return [
      ...grouped.ACTIONS,
      ...grouped.INSTRUMENTS,
      ...grouped.NAVIGATION,
      ...grouped.SETUPS,
    ];
  }, [grouped]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation listener (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = flatItems[selectedIndex];
        if (selected) executeCommand(selected);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flatItems, selectedIndex, onClose]);

  const executeCommand = (item: CommandItem) => {
    onClose();

    if (item.actionKey === "TOGGLE_THEME") {
      setTheme(theme === "dark" ? "light" : "dark");
      return;
    }

    if (item.actionKey === "EXPORT_CSV") {
      exportSetupsToCSV(setups);
      return;
    }

    if (item.href) {
      router.push(item.href);
    }
  };

  if (!isOpen) return null;

  let currentIndexTracker = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-muted/20">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, pair (EURUSD), or action..."
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden sm:inline-block rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results Scroll Area */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-border/30">
          {flatItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No matching commands or pairs found for &quot;{query}&quot;.
            </div>
          ) : (
            (
              [
                ["ACTIONS", "Quick Terminal Actions"],
                ["INSTRUMENTS", "Instruments & Technical Charts"],
                ["NAVIGATION", "Application Navigation"],
                ["SETUPS", "Active Trading Setups"],
              ] as [CommandCategory, string][]
            ).map(([categoryKey, categoryLabel]) => {
              const categoryItems = grouped[categoryKey];
              if (categoryItems.length === 0) return null;

              return (
                <div key={categoryKey} className="py-2 first:pt-0">
                  <p className="px-2 pb-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {categoryLabel}
                  </p>
                  <div className="space-y-0.5">
                    {categoryItems.map((item) => {
                      const itemIndex = currentIndexTracker++;
                      const isSelected = itemIndex === selectedIndex;
                      const ItemIcon = item.icon;

                      return (
                        <div
                          key={item.id}
                          onClick={() => executeCommand(item)}
                          className={cn(
                            "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted/50 text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ItemIcon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isSelected ? "text-primary-foreground" : "text-muted-foreground"
                              )}
                            />
                            <div className="truncate">
                              <span className="font-semibold">{item.title}</span>
                              {item.subtitle && (
                                <p
                                  className={cn(
                                    "text-[11px] truncate",
                                    isSelected
                                      ? "text-primary-foreground/80"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {item.badge && (
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.2 text-[10px] font-bold font-mono",
                                  isSelected
                                    ? "bg-primary-foreground/20 text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                            {isSelected && <ArrowRight className="h-3 w-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Keyboard Navigation Hints */}
        <div className="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono font-semibold">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="font-mono font-semibold">↵</kbd> Select
            </span>
            <span>
              <kbd className="font-mono font-semibold">ESC</kbd> Close
            </span>
          </div>
          <span className="font-mono text-[10px]">ForexPulse Terminal</span>
        </div>
      </div>
    </div>
  );
}
```

#### Why this was written this way:
- **Direct Component Rendering:** By typing `item.icon` as `LucideIcon`, we directly render `<ItemIcon />`, eliminating 15 hardcoded switch statements and keeping the component lightweight and maintainable.
- **Full Keyboard Operability:** Arrow down/up tracks a flattened index through nested categories with automatic wrapping, allowing pure keyboard operation.
- **Escape & Backdrop Handling:** Pressing Escape or clicking the backdrop gracefully dismounts the palette.

---

### 3. Upgrade Universal Header (`components/layout/Header.tsx`)
Cleanly integrate the command palette search trigger and global `Ctrl + K` / `⌘K` listener.

**File:** `components/layout/Header.tsx`
```tsx
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
```

---

## 🧪 Verification & Testing
1. Anywhere on the dashboard, press **`Ctrl + K`** (or **`Cmd + K`** on macOS), or click the search box in the header.
2. Confirm the **Command Palette Dialog** opens with focus on the input bar.
3. Test search queries:
   - Type `"Gold"` or `"XAUUSD"` -> navigates to `/technical`.
   - Type `"Risk"` -> navigates to `/risk`.
   - Type `"Export"` -> triggers the trade journal CSV download.
   - Type `"Theme"` -> toggles between light and dark mode.
4. Test keyboard navigation using the **`↑`** and **`↓`** arrow keys, pressing **`Enter`** to execute and **`Escape`** to dismiss.
