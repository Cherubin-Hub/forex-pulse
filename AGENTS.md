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
- `types/` — Shared TypeScript types (the shape of our data).
- `lib/services/` — Controller layer. The ONLY place that knows where data comes from.
- `lib/mock/` — Mock data. Must always use `status: "MOCK"`.
- `lib/formatters.ts` — Pure formatting functions (price, percent, time).
- `components/market/` — Market-related UI (cards, badges, sparklines).
- `hooks/` — Custom React hooks (camelCase, must start with `use`).
- `components/sessions/` — Market session UI.
- `lib/sessions.ts` — Time zone and session logic. Pure functions that take `now` as a parameter.
- `components/calendar/` — Economic calendar and news-risk UI.
- `lib/calendar.ts` — Event timing and grouping logic (pure functions, take `now`).

## 6. Git Conventions
- Branch: `main` is always working/deployable.
- Commit messages follow Conventional Commits:
  - `feat:` new feature — `feat: add currency pair cards`
  - `fix:` bug fix — `fix: sidebar pill jumping on mobile`
  - `refactor:` code change without behavior change
  - `style:` formatting / UI-only tweaks
  - `docs:` documentation (AGENT.md, README)
  - `chore:` dependencies, config
- NEVER commit `.env` files or API keys.

## 7. Data Integrity Rules
- Missing data is `null` — NEVER a guessed or default number.
- Every price MUST carry `timestamp`, `source`, `delayMinutes`, and `status`.
- The UI MUST display data status (Live / Delayed / Mock / Unavailable).
- Components NEVER fetch data directly — always go through `lib/services/`.
- Avoid `Math.random()` / `Date.now()` differences between server and client renders (hydration errors).
- Economic event `actual` is `null` until released and verified.
- Time-relative filtering (upcoming / released) happens on the CLIENT with `useNow`, never cached on the server.
- Pass a single `now` down as a prop to lists — do not call `useNow()` per row.