import { getAuthenticatedUser } from "@/lib/auth/user";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { Toaster } from "@/components/ui/sonner"; // 👈 1. IMPORT TOASTER

export const metadata: Metadata = {
  title: "ForexPulse",
  description: "Personal Forex Intelligence Dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getAuthenticatedUser();
  const identity = user ? { userId: user.userId, email: user.email } : null;
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SettingsProvider
            key={identity?.userId ?? "signed-out"}
            identity={identity}
          >
            {children}
            <Toaster position="bottom-right" richColors closeButton />{" "}
            {/* 👈 2. MOUNT TOASTER */}
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
