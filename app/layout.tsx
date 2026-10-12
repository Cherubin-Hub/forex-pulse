import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { Toaster } from "@/components/ui/sonner"; // 👈 1. IMPORT TOASTER

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ForexPulse",
  description: "Personal Forex Intelligence Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SettingsProvider>
            {children}
            <Toaster position="bottom-right" richColors closeButton /> {/* 👈 2. MOUNT TOASTER */}
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
