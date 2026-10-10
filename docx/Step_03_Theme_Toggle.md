# Step 3: Theme Toggle & Hydration Safety

## 🎯 Overview
In this step, we implement Dark, Light, and System theme switching using `next-themes` and Base UI menu primitives, ensuring zero hydration flash or console warnings during server-side rendering.

---

### 1. Theme Provider Wrapper (`components/providers/ThemeProvider.tsx`)

A client-side wrapper around `next-themes` that injects the theme context into the React tree.

**File:** `components/providers/ThemeProvider.tsx`
```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

#### Why this was written this way:
- **`"use client"` Isolation:** Isolates client context execution to this provider, allowing the root `app/layout.tsx` to remain a performant Server Component.

---

### 2. Base UI Theme Switcher (`components/layout/ThemeToggle.tsx`)

Builds an accessible dropdown menu allowing traders to select Light, Dark, or System theme.

**File:** `components/layout/ThemeToggle.tsx`
```tsx
"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### Why this was written this way:
- **Base UI `render` Prop:** Base UI's trigger accepts a `render` prop rather than Radix's `asChild`, eliminating TypeScript property errors.
- **Icon Rotation Morphing:** CSS transitions (`dark:-rotate-90 dark:scale-0`) rotate and scale the Sun into the Moon icon seamlessly when changing modes.
- **Screen Reader Support:** Includes `<span className="sr-only">Toggle theme</span>` for accessibility compliance.
