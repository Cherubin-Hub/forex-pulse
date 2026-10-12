"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShortcutsHelpModal } from "@/components/command/ShortcutsHelpModal";

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const pendingPrefix = useRef<string | null>(null);
  const prefixTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore keystrokes when typing inside inputs, textareas, or select dropdowns
      const activeElement = document.activeElement;
      const isInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        activeElement?.getAttribute("contenteditable") === "true";

      if (isInput) return;

      const key = e.key.toLowerCase();

      // 1. Help modal toggle: '?'
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
        return;
      }

      // 2. Escape dismisses help modal
      if (e.key === "Escape" && isHelpOpen) {
        e.preventDefault();
        setIsHelpOpen(false);
        return;
      }

      // 3. Two-key Vim sequence engine (e.g. 'g' then 'd')
      if (pendingPrefix.current === "g") {
        pendingPrefix.current = null;
        if (prefixTimer.current) clearTimeout(prefixTimer.current);

        switch (key) {
          case "d":
            e.preventDefault();
            router.push("/");
            break;
          case "s":
            e.preventDefault();
            router.push("/setups");
            break;
          case "m":
            e.preventDefault();
            router.push("/markets");
            break;
          case "c":
            e.preventDefault();
            router.push("/calendar");
            break;
          case "r":
            e.preventDefault();
            router.push("/risk");
            break;
          case "t":
            e.preventDefault();
            router.push("/technical");
            break;
          case "h":
            e.preventDefault();
            router.push("/setups/history");
            break;
        }
        return;
      }

      // Detect prefix 'g'
      if (key === "g" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        pendingPrefix.current = "g";
        // 1.2-second timeout window to press the second key
        if (prefixTimer.current) clearTimeout(prefixTimer.current);
        prefixTimer.current = setTimeout(() => {
          pendingPrefix.current = null;
        }, 1200);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (prefixTimer.current) clearTimeout(prefixTimer.current);
    };
  }, [router, isHelpOpen]);

  return (
    <>
      {children}
      <ShortcutsHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}
