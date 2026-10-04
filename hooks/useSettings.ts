"use client";

import { useContext } from "react";
import { SettingsContext, type SettingsContextValue } from "@/components/providers/SettingsProvider";

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside <SettingsProvider>");
  }
  return context;
}
