import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LiveStreamingTickerTape } from "@/components/market/LiveStreamingTickerTape";
import { CircuitBreakerBanner } from "@/components/layout/CircuitBreakerBanner";
import { KeyboardShortcutsProvider } from "@/components/providers/KeyboardShortcutsProvider"; // 👈 1. IMPORT

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <KeyboardShortcutsProvider> {/* 👈 2. WRAP SHELL */}
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <LiveStreamingTickerTape />
          <CircuitBreakerBanner />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </KeyboardShortcutsProvider>
  );
}
