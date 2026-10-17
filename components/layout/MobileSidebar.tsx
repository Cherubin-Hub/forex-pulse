"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Menu, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { normalizeBaseUrl } from "@/lib/sso/session";

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const rawGatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000";
  const gatewayUrl = normalizeBaseUrl(rawGatewayUrl, "http://localhost:3000");

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
          <div key="mobile-sidebar-container">
            {/* Backdrop */}
            <motion.div
              key="mobile-sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            />

            {/* Drawer */}
            <motion.aside
              key="mobile-sidebar-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-sidebar text-sidebar-foreground shadow-xl md:hidden"
            >
              <div className="flex h-14 items-center justify-between border-b border-border px-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Activity className="h-4 w-4" />
                  </div>
                  <span className="text-base font-semibold tracking-tight">ForexPulse</span>
                </div>
                <Button variant="ghost" size="icon" aria-label="Close menu" onClick={close}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <SidebarNav pillId="mobile-active-pill" onNavigate={close} />

              <div className="border-t border-border p-3">
                <a
                  href={`${gatewayUrl}/portal`}
                  onClick={close}
                  className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-emerald-500"
                >
                  <Layers className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>Pulse Gateway</span>
                </a>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
