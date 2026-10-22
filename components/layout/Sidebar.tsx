"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ChevronsLeft, Layers } from "lucide-react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { cn } from "@/lib/utils";
import { gatewayBaseUrl } from "@/lib/redirects";

const EXPANDED_WIDTH = 248;
const COLLAPSED_WIDTH = 72;
const STORAGE_KEY = "fp_sidebar_collapsed";

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const gatewayUrl = gatewayBaseUrl();

  // Strict Hydration Safety Pattern for browser storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Graceful fallback if localStorage is unavailable
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Graceful fallback
      }
      return next;
    });
  };

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
              key="sidebar-brand-name"
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

      {/* Return to Pulse Gateway Hub */}
      <div className="border-t border-border p-2">
        <a
          href={gatewayUrl ? `${gatewayUrl}/portal` : "/settings"}
          title={isCollapsed ? "Pulse Gateway Hub" : undefined}
          className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-emerald-500"
        >
          <Layers className="h-4 w-4 shrink-0 text-emerald-500" />
          {!isCollapsed && (
            <span className="whitespace-nowrap font-medium">Pulse Gateway</span>
          )}
        </a>
      </div>

      {/* Collapse button */}
      <div className="border-t border-border p-3">
        <button
          onClick={toggleCollapse}
          className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <ChevronsLeft
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-300",
              isCollapsed && "rotate-180",
            )}
          />
          {!isCollapsed && <span className="whitespace-nowrap">Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
