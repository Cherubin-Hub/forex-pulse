let isDaemonRunning = false;
let daemonInterval: NodeJS.Timeout | null = null;

/**
 * Starts the in-process 24/7 background automation daemon.
 * Runs continuously inside the Node.js server instance without needing any open browser tabs.
 */
export function startServerAutomationDaemon(): void {
  // Guard against duplicate instantiation (e.g. Next.js hot reloads)
  if (isDaemonRunning) {
    return;
  }

  isDaemonRunning = true;
  console.log("[24/7 Server Daemon] Initializing headless market scanner & trade resolution daemon...");

  // Initial scan 8 seconds after server boot
  setTimeout(async () => {
    try {
      const { executeHeadlessAutomationCycle } = await import(
        "@/lib/services/headlessAutomationEngine"
      );
      const res = await executeHeadlessAutomationCycle();
      console.log(
        `[24/7 Server Daemon] Initial cycle completed (${res.durationMs}ms): ${res.scannedSymbols} symbols scanned, ${res.opportunitiesFound} setups found, ${res.setupsCreated} committed, ${res.setupsUpdated} resolved.`
      );
    } catch (err) {
      console.warn("[24/7 Server Daemon] Initial cycle warning:", err);
    }
  }, 8_000);

  // Continuous background loop: runs every 90 seconds (1.5 minutes)
  const CYCLE_INTERVAL_MS = 90_000;
  daemonInterval = setInterval(async () => {
    try {
      const { executeHeadlessAutomationCycle } = await import(
        "@/lib/services/headlessAutomationEngine"
      );
      const res = await executeHeadlessAutomationCycle();
      if (res.setupsCreated > 0 || res.setupsUpdated > 0) {
        console.log(
          `[24/7 Server Daemon] Cycle action: ${res.setupsCreated} new setup(s) committed, ${res.setupsUpdated} setup(s) resolved across ${res.activeUsersCount} user account(s).`
        );
      }
    } catch (err) {
      console.warn("[24/7 Server Daemon] Background cycle warning:", err);
    }
  }, CYCLE_INTERVAL_MS);
}

/**
 * Stops the server daemon (used for graceful shutdown or testing).
 */
export function stopServerAutomationDaemon(): void {
  if (daemonInterval) {
    clearInterval(daemonInterval);
    daemonInterval = null;
  }
  isDaemonRunning = false;
  console.log("[24/7 Server Daemon] Daemon stopped.");
}
