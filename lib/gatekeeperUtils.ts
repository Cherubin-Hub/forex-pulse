import type { TradingSetup } from "@/types/setup";
import type { EconomicEvent } from "@/types/calendar";
import type { UserSettings } from "@/lib/schemas/settings";
import { getNewsWindows } from "@/lib/settings";
import { INSTRUMENTS } from "@/lib/constants/instruments";

export type AuditVerdict = "PASS" | "WARNING" | "BLOCKED";

export type GatekeeperAuditResult = {
  overallVerdict: AuditVerdict;
  newsCheck: {
    verdict: AuditVerdict;
    conflictEvent: EconomicEvent | null;
    minutesUntil: number | null;
    message: string;
  };
  riskCheck: {
    verdict: AuditVerdict;
    currentOpenCount: number;
    maxOpenSetups: number;
    totalRiskPercent: number;
    message: string;
  };
  confluenceCheck: {
    verdict: AuditVerdict;
    count: number;
    confluences: string[];
    message: string;
  };
};

/**
 * Runs the 3-pillar institutional pre-trade risk audit against macro events, portfolio capacity, and confluences.
 */
export function evaluatePreTradeAudit(
  setup: TradingSetup,
  events: EconomicEvent[],
  activeSetups: TradingSetup[],
  settings: UserSettings,
  now: Date,
): GatekeeperAuditResult {
  const inst = INSTRUMENTS.find((i) => i.symbol === setup.symbol);
  const baseCurr = inst?.base ?? setup.symbol.slice(0, 3);
  const quoteCurr = inst?.quote ?? setup.symbol.slice(3, 6);

  // 1. Macro News Check (Red Folder High Impact Proximity)
  const nowMs = now.getTime();
  const windows = getNewsWindows(settings);
  const relevantHighEvents = events
    .filter(
      (event) =>
        event.status === "LIVE" &&
        event.impact === "HIGH" &&
        (event.currency === baseCurr || event.currency === quoteCurr),
    )
    .map((event) => ({
      event,
      minutesUntil: (Date.parse(event.scheduledAt) - nowMs) / 60000,
    }))
    .filter(
      (item) =>
        item.minutesUntil >= -windows.postReleaseMinutes &&
        item.minutesUntil <= windows.preReleaseMinutes,
    )
    .sort((a, b) => Math.abs(a.minutesUntil) - Math.abs(b.minutesUntil));
  const conflict = relevantHighEvents[0] ?? null;
  const newsVerdict: AuditVerdict = conflict ? "BLOCKED" : "PASS";
  const newsMessage = conflict
    ? `Trading paused around ${conflict.event.title} (${conflict.event.currency}).`
    : "No high-impact event within your configured news buffer.";

  // 2. Risk Ceiling & Capacity Check
  const otherActive = activeSetups.filter(
    (s) =>
      s.id !== setup.id &&
      (s.status === "WAITING_FOR_CONFIRMATION" ||
        s.status === "ENTRY_TRIGGERED"),
  );
  const currentOpenCount = otherActive.length + 1; // including this one
  const maxOpenSetups = settings.maxOpenSetups;
  const totalRiskPercent = Number(
    (
      otherActive.reduce(
        (sum, item) => sum + (item.riskPercent ?? settings.riskPerTradePercent),
        0,
      ) + settings.riskPerTradePercent
    ).toFixed(2),
  );

  let riskVerdict: AuditVerdict = "PASS";
  let riskMessage = `Portfolio risk capacity OK (${currentOpenCount}/${maxOpenSetups} open positions).`;

  if (currentOpenCount > maxOpenSetups) {
    riskVerdict = "BLOCKED";
    riskMessage = `Capacity breached! Max open positions limit (${maxOpenSetups}) reached.`;
  } else if (currentOpenCount === maxOpenSetups) {
    riskVerdict = "WARNING";
    riskMessage = `Final capacity slot (${currentOpenCount}/${maxOpenSetups}). No further trades allowed.`;
  }

  // 3. Confluence Verification
  const count = setup.confluenceTags.length;
  let confluenceVerdict: AuditVerdict = "PASS";
  let confluenceMessage = `${count} confluence tags recorded.`;

  if (count < 2) {
    confluenceVerdict = "WARNING";
    confluenceMessage = `Low confluence (${count}). Minimum 2 confluences recommended.`;
  }

  // Overall Verdict
  let overallVerdict: AuditVerdict = "PASS";
  if (newsVerdict === "BLOCKED" || riskVerdict === "BLOCKED") {
    overallVerdict = "BLOCKED";
  } else if (riskVerdict === "WARNING" || confluenceVerdict === "WARNING") {
    overallVerdict = "WARNING";
  }

  return {
    overallVerdict,
    newsCheck: {
      verdict: newsVerdict,
      conflictEvent: conflict?.event ?? null,
      minutesUntil: conflict?.minutesUntil ?? null,
      message: newsMessage,
    },
    riskCheck: {
      verdict: riskVerdict,
      currentOpenCount,
      maxOpenSetups,
      totalRiskPercent,
      message: riskMessage,
    },
    confluenceCheck: {
      verdict: confluenceVerdict,
      count,
      confluences: setup.confluenceTags,
      message: confluenceMessage,
    },
  };
}
