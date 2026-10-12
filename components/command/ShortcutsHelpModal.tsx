"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    category: "Vim-Style Navigation",
    items: [
      { keys: ["G", "D"], label: "Go to Overview Dashboard" },
      { keys: ["G", "S"], label: "Go to Active Setups" },
      { keys: ["G", "M"], label: "Go to Markets Hub" },
      { keys: ["G", "C"], label: "Go to Economic Calendar" },
      { keys: ["G", "R"], label: "Go to Risk Calculator" },
      { keys: ["G", "T"], label: "Go to Technical Console" },
      { keys: ["G", "H"], label: "Go to Trade History" },
    ],
  },
  {
    category: "Terminal Controls",
    items: [
      { keys: ["⌘", "K"], label: "Command Palette Search" },
      { keys: ["?"], label: "Toggle Shortcuts Cheatsheet" },
      { keys: ["Esc"], label: "Dismiss Open Modal / Panel" },
    ],
  },
];

export function ShortcutsHelpModal({ isOpen, onClose }: ShortcutsHelpModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-lg"
          >
            <Card className="glass shadow-2xl border-primary/20 p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Keyboard className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground tracking-tight">Terminal Hotkeys</h3>
                    <p className="text-xs text-muted-foreground">High-velocity keyboard shortcuts for power traders.</p>
                  </div>
                </div>

                <Button size="icon-xs" variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-5">
                {SHORTCUT_GROUPS.map((group) => (
                  <div key={group.category} className="space-y-2.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {group.category}
                    </h4>
                    <div className="grid gap-2">
                      {group.items.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs"
                        >
                          <span className="text-foreground/90 font-medium">{item.label}</span>
                          <div className="flex items-center gap-1">
                            {item.keys.map((k) => (
                              <kbd
                                key={k}
                                className="rounded border border-border bg-card px-2 py-0.5 font-mono text-[11px] font-bold text-foreground shadow-xs"
                              >
                                {k}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-3 text-center">
                <p className="text-[11px] text-muted-foreground">
                  Press <kbd className="font-mono font-bold text-foreground">Esc</kbd> or click outside to dismiss this cheatsheet.
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
