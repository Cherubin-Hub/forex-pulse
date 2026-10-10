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
