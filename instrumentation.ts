/**
 * Next.js Instrumentation Hook: Runs once when the Next.js server instance starts.
 * Registers the 24/7 headless background market scanner and trade execution engine.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startServerAutomationDaemon } = await import(
      "@/lib/services/serverAutomationDaemon"
    );
    startServerAutomationDaemon();
  }
}
