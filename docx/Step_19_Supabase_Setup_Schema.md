# Step 19: Supabase Database Architecture & Client Setup

## 🎯 Overview
In this step, we configure the cloud PostgreSQL infrastructure using Supabase. We build typed server and browser client initializers using `@supabase/ssr` to synchronize authentication cookies across Next.js Server Components, Server Actions, and Client Components, and build a seeding endpoint to populate template data.

---

### 1. Server Supabase Client (`lib/supabase/server.ts`)

Instantiates the Supabase client for Server Components, Server Actions, and Route Handlers, binding it to Next.js's asynchronous cookie store.

**File:** `lib/supabase/server.ts`
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Creates a Supabase client for use in Next.js Server Components, Server Actions, or Route Handlers.
 * Automatically synchronizes auth session tokens with Next.js request cookies.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set."
    );
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}
```

#### Why this was written this way:
- **Async Cookie Access:** Next.js App Router treats `cookies()` as an asynchronous function. We `await cookies()` to access the current session headers.
- **Server Component Read-Only Guard:** Modifying cookies from a Server Component throws an error in Next.js. The `try/catch` block prevents crashes during Server Component execution.

---

### 2. Browser Supabase Client (`lib/supabase/client.ts`)

Instantiates the client for Client Components (`"use client"`).

**File:** `lib/supabase/client.ts`
```typescript
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Creates a Supabase client for use inside Client Components ("use client").
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set."
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
```

#### Why this was written this way:
- **Singleton Browser Client:** Utilizes `createBrowserClient` from `@supabase/ssr` to maintain the session in `document.cookie` without needing manual token refresh logic.

---

### 3. Database Seeding Route Handler (`app/api/seed/route.ts`)

An administrative API endpoint to populate template setups and institutional session reports into PostgreSQL.

**File:** `app/api/seed/route.ts`
```typescript
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MOCK_ACTIVE_SETUPS, MOCK_HISTORY_SETUPS } from "@/lib/mock/setups";
import { MOCK_REPORTS } from "@/lib/mock/reports";
import type { Database, Json } from "@/types/database";

type SetupInsert = Database["public"]["Tables"]["trading_setups"]["Insert"];
type ReportInsert = Database["public"]["Tables"]["session_reports"]["Insert"];

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Admin client that bypasses RLS for system/seed data
    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Seed Trading Setups
    const allSetups = [...MOCK_ACTIVE_SETUPS, ...MOCK_HISTORY_SETUPS];
    const setupsToInsert: SetupInsert[] = allSetups.map((s) => ({
      user_id: null,
      symbol: s.symbol,
      direction: s.direction,
      entry_min: s.entryMin,
      entry_max: s.entryMax,
      stop_loss: s.stopLoss,
      take_profit_1: s.takeProfit1,
      take_profit_2: s.takeProfit2,
      risk_reward: s.riskReward,
      status: s.status,
      invalidation_rule: s.invalidationRule,
      notes: s.notes,
      confluence_tags: s.confluenceTags,
    }));

    const { error: setupsError } = await supabase
      .from("trading_setups")
      .insert(setupsToInsert);

    if (setupsError) {
      return NextResponse.json(
        { success: false, error: setupsError.message },
        { status: 500 }
      );
    }

    // 2. Seed Session Reports
    const reportsToInsert: ReportInsert[] = MOCK_REPORTS.map((r) => ({
      title: r.title,
      session: r.session,
      timestamp: r.timestamp,
      bias: r.bias,
      volatility: r.volatility,
      executive_summary: r.executiveSummary,
      macro_catalysts: r.macroCatalysts,
      key_levels: r.keyLevels as unknown as Json,
      playbook: r.playbook as unknown as Json,
    }));

    const { error: reportsError } = await supabase
      .from("session_reports")
      .insert(reportsToInsert);

    if (reportsError) {
      return NextResponse.json(
        { success: false, error: reportsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${setupsToInsert.length} setups and ${reportsToInsert.length} reports into Supabase!`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Seeding failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

#### Why this was written this way:
- **Service Role Key Bypass:** Row-Level Security blocks anonymous insert operations. Seeding requires the privileged `SUPABASE_SERVICE_ROLE_KEY` to insert system template rows where `user_id = null`.
