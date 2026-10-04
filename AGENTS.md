# ForexPulse Engineering Standards

## 1. Tech Stack
- Framework: Next.js (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- UI Components: shadcn/ui
- Animations: Framer Motion
- Database & Auth: Supabase

## 2. Naming Conventions
- **Folders:** Always `kebab-case` (e.g., `components/ui`, `app/market-overview`).
- **React Components:** Always `PascalCase` (e.g., `Sidebar.tsx`, `CurrencyCard.tsx`).
- **Utility Functions/Hooks:** Always `camelCase` (e.g., `useMarketData.ts`, `formatPrice.ts`).
- **Constants/Enums:** Always `UPPER_SNAKE_CASE` (e.g., `MAX_RISK_PERCENT`, `SESSION_TIMES`).

## 3. UI / UX Rules
- **Themes:** Every component MUST support Light and Dark mode using Tailwind's `dark:` modifier.
- **Animations:** Use `framer-motion` for page transitions, modal popups, and layout changes. Keep animations subtle (duration: 0.2s - 0.4s).
- **Layout:** The application uses a Universal Sidebar and Header layout. Main content is rendered inside the `<main>` tag next to the sidebar.

## 4. Architecture (MVC)
- **Model:** Handled by Supabase and defined in database schemas.
- **View:** React Server Components (where possible) and Client Components (for interactivity) in the `app/` and `components/` folders.
- **Controller:** Next.js Route Handlers (`app/api/`) and Server Actions. Data fetching should happen on the server before reaching the client.

## 5. Folder Structure
- `app/(dashboard)/` — All authenticated pages. Inherit Sidebar + Header.
- `components/layout/` — App shell components (Sidebar, Header, ThemeToggle).
- `components/providers/` — React context providers.
- `components/ui/` — shadcn generated components. Do not edit unless necessary.
- `lib/constants/` — App-wide constants (UPPER_SNAKE_CASE exports).
- Navigation items are defined ONLY in `lib/constants/navigation.ts`.
- `components/shared/` — Reusable UI used across multiple pages (e.g., PagePlaceholder).