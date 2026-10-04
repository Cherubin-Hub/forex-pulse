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
