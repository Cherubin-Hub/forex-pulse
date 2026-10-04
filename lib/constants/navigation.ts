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
