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
