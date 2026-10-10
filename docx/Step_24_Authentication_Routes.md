# Step 24: Secure Authentication & Middleware Route Guards

## 🎯 Overview
In this step, we secure the Forex Pulse dashboard behind Supabase email/password authentication using Next.js Edge Middleware for route protection, Server Actions for credential handling, and a dedicated login interface.

---

### 1. Create the Auth Middleware (`middleware.ts`)

The Next.js middleware runs before every request. We use it to refresh the Supabase Auth session token and verify user credentials. If an unauthenticated user attempts to visit the dashboard, they are redirected to `/login`.

**File:** `middleware.ts`
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Create the Supabase client for the middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Fetch the current user session securely
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/api");

  // If no user and not on a public route, redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is already logged in and tries to visit login, redirect to dashboard
  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

// Ensure the middleware only runs on actual pages/API routes, ignoring static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

#### Why this was written this way:
- **`@supabase/ssr` Cookie Synchronization:** `createServerClient` inside middleware safely manages cookie parsing, refreshing expired tokens automatically.
- **Static Asset Bypass:** The `matcher` config excludes images, fonts, and static Next.js assets to avoid wasting database calls on static asset requests.
- **Edge Redirection:** Authentication checks occur at the edge before any React components or data fetching execute.

---

### 2. Create Auth Server Actions (`app/actions/authActions.ts`)

Handling authentication via Server Actions ensures that login credentials (email and password) are processed securely on the server without exposure to client-side network interceptors.

**File:** `app/actions/authActions.ts`
```typescript
"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  // Await asynchronous server client
  const supabase = await createServerSupabaseClient();
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Purge the cache for the layout so the user state updates
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  
  revalidatePath("/", "layout");
  redirect("/login");
}
```

#### Why this was written this way:
- **`createServerSupabaseClient` Asynchrony:** In Next.js App Router, `cookies()` is asynchronous. We `await` the client helper to ensure session cookies are injected properly.
- **Server-Side Redirect:** `redirect("/")` terminates the Server Action and directs the browser to the dashboard once the authentication cookie is established.

---

### 3. Build the Login Page (`app/login/page.tsx`)

A dedicated authentication interface featuring real-time form validation, loading spinner feedback, and error banner display.

**File:** `app/login/page.tsx`
```tsx
"use client";

import { useState } from "react";
import { login } from "@/app/actions/authActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    
    const result = await login(formData);
    
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border/50 bg-card text-card-foreground shadow-xl shadow-black/10">
        <div className="flex flex-col space-y-3 p-6 text-center">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Activity className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h3 className="text-2xl font-bold tracking-tight">Forex Pulse</h3>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your dashboard
          </p>
        </div>
        
        <div className="p-6 pt-0">
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="trader@example.com" 
                required 
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                className="bg-background"
              />
            </div>

            {error && (
              <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Authenticating..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

#### Why this was written this way:
- **Card-Free Tailwind Structure:** Replaces external Card component dependencies with standard semantic HTML (`div`, `h3`, `p`) styled using Tailwind tokens (`bg-card`, `border-border`), eliminating missing module compilation errors.
- **Seamless Loading State:** Displays `"Authenticating..."` and disables the submit button while the credentials verify.
