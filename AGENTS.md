# Forex Pulse - AI Agent Rulebook & Architecture Guide

## 🎯 Project Overview
**Forex Pulse** is a personal, high-performance Forex Intelligence Dashboard designed for strict risk management and macroeconomic tracking. It acts as a digital disciplinarian and analysis hub.

## 🛠 Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Animations:** Framer Motion
- **Validation:** Zod + React Hook Form
- **Database / Auth (Future):** Supabase (PostgreSQL)

## 🏗 Architectural Rules (MVC Monolith)
We strictly separate data models, UI, and business logic to ensure an easy transition from mock data to a real backend.
1. **Model (Types/Schemas):** 
   - All TypeScript interfaces live in `/types/`. 
   - All Zod validation schemas live in `/lib/schemas/`.
2. **View (UI/Pages):** 
   - Pages live in `/app/(dashboard)/`.
   - UI blocks live in `/components/`.
   - Favor Server Components by default. Use `"use client"` *only* when hooks, interactivity, or Framer Motion animations are required.
3. **Controller (Services/Mock):** 
   - Components MUST NOT fetch or shape data directly. 
   - Components call asynchronous controllers in `/lib/services/` (e.g., `getQuotes()`).
   - Controllers currently return data from `/lib/mock/`. Later, they will query Supabase or external APIs.

## 🧩 Established Coding Patterns
1. **Strict Hydration Safety:** 
   - When using browser APIs (like `localStorage` or native system clocks), the initial server render must match the first client render.
   - Use the `useEffect` sync pattern and safely bypass the ESLint rule with `// eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern`.
2. **Centralized Formatting:** 
   - Never format prices, times, or percentages inline.
   - Always use the dedicated helper functions in `/lib/formatters.ts` (e.g., `formatPrice()`, `calculateChange()`, `formatTimePHT()`).
3. **Relative Time Formatting:**
   - Avoid bloated external date libraries (like `date-fns` or `moment`) where possible. Use native `Intl` APIs or simple math helpers.
4. **Visual Hierarchy:**
   - Color code strict risk rules and impact data (Red = High Impact/Loss, Green = Won, Amber = Medium Impact/Warning).

## 🤖 AI Assistant Directives (CRITICAL)
- **NO DIRECT CODE GENERATION:** The AI must NEVER overwrite or create files directly using tools.
- **MANUAL CODING:** The AI must provide exact, copy-pasteable code blocks for the user to implement manually.
- **EXPLANATIONS REQUIRED:** Every code block must be accompanied by a clear explanation of *why* it was written that way.
- **STRICT TYPES:** Never use `any`. Always rely on defined TypeScript types.

---

## 🗺 Roadmap & Progress

### ✅ Phase 1: Core Shell & Macro Data (COMPLETED)
- [x] Next.js initialization & shadcn/ui setup.
- [x] Universal App Layout (Sidebar, Header, Mobile Navigation).
- [x] Theme Toggle (Dark/Light).
- [x] Market Session Bar (DST-aware, PHT timezone, Hydration-safe).
- [x] Economic Calendar (High impact filtering, News Risk Banner).
- [x] Settings Module (React Hook Form, Zod validation, LocalStorage sync).
- [x] Dashboard Overview (Currency Cards, Sparklines).
- [x] Gold (XAU/USD) Analysis (Macro Drivers, Key Levels).
- [x] Market News Module (Impact-coded feed).

### 🚧 Phase 2: Technicals, Execution & Risk (UP NEXT)
- [x] **Risk Management (`/risk`):** Position size calculator based on strict account percentage risk.
- [x] **Trading Setups State Machine:** Finalizing the logic for `WAITING` -> `TRIGGERED` -> `TP/SL`.
- [x] **Technical Analysis (`/technical`):** Multi-timeframe trend dashboards (EMA, RSI, ATR).
- [x] **TradingView Integration:** Embedding interactive chart widgets on relevant pages.

### 🔮 Phase 3: Analytics & Backend (FUTURE)
- [x] Setup History & Win-rate Analytics.
- [x] AI-generated Session Reports (`/reports`).
- [ ] Supabase Integration (PostgreSQL + Auth).