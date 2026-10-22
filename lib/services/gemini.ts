import type {
  SessionType,
  MarketBias,
  VolatilityExpectation,
} from "@/types/report";

export interface AiReportContext {
  session: SessionType;
  verifiedQuotes: {
    symbol: string;
    price: number;
    previousClose?: number | null;
    changePercent?: number;
    bias: string;
  }[];
  calendarEvents: {
    title: string;
    currency: string;
    impact: string;
    scheduledAt: string;
  }[];
  activeSetups: {
    symbol: string;
    direction: string;
    confluences: string[];
  }[];
  riskRules: string;
}

export interface AiReportSynthesis {
  bias: MarketBias;
  volatility: VolatilityExpectation;
  executiveSummary: string;
  focusPairs: string[];
  tradeOpportunities: string[];
  provider: "gemini-flash" | "deterministic-fallback";
}

const VALID_BIASES: MarketBias[] = [
  "BULLISH_USD",
  "BEARISH_USD",
  "NEUTRAL",
  "RISK_OFF",
  "RISK_ON",
];

const VALID_VOLATILITIES: VolatilityExpectation[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "EXTREME",
];

/**
 * Synthesizes institutional session briefings using Google Gemini Flash (Free Tier).
 * Falls back gracefully to deterministic analysis if GEMINI_API_KEY is not configured or offline.
 */
export async function generateGeminiSessionBriefing(
  context: AiReportContext,
): Promise<AiReportSynthesis | null> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const prompt = `You are the Lead Macro Strategist and Risk Officer for Forex Pulse, an institutional FX intelligence desk.
Synthesize a pre-session briefing for the upcoming trading session: "${context.session.replace("_", " ")}".

MARKET DATA SNAPSHOT:
${JSON.stringify(context.verifiedQuotes, null, 2)}

SCHEDULED HIGH-IMPACT CALENDAR CATALYSTS:
${JSON.stringify(context.calendarEvents, null, 2)}

ACTIVE TRADER SETUPS:
${JSON.stringify(context.activeSetups, null, 2)}

RISK MANAGEMENT MANDATE:
${context.riskRules}

REQUIREMENTS:
1. Provide a concise, high-impact institutional executive summary (2 to 3 sentences maximum) highlighting key liquidity themes, session biases, and news catalysts.
2. Market bias must strictly be one of: "BULLISH_USD", "BEARISH_USD", "NEUTRAL", "RISK_OFF", "RISK_ON".
3. Volatility expectation must strictly be one of: "LOW", "NORMAL", "HIGH", "EXTREME".
4. List primary focus pairs (e.g. ["EURUSD", "GBPUSD"]).
5. List actionable trade opportunities or cautionary risk notes for this session.

Return your analysis strictly as valid JSON with this exact schema:
{
  "bias": "BULLISH_USD" | "BEARISH_USD" | "NEUTRAL" | "RISK_OFF" | "RISK_ON",
  "volatility": "LOW" | "NORMAL" | "HIGH" | "EXTREME",
  "executiveSummary": "string",
  "focusPairs": ["string"],
  "tradeOpportunities": ["string"]
}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          responseMimeType: "application/json",
        },
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(
        `[Gemini] API returned status ${res.status}: ${res.statusText}`,
      );
      return null;
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      return null;
    }

    const parsed = JSON.parse(candidate);

    const bias: MarketBias = VALID_BIASES.includes(parsed.bias)
      ? parsed.bias
      : "NEUTRAL";

    const volatility: VolatilityExpectation = VALID_VOLATILITIES.includes(
      parsed.volatility,
    )
      ? parsed.volatility
      : "NORMAL";

    const executiveSummary =
      typeof parsed.executiveSummary === "string" && parsed.executiveSummary.trim()
        ? parsed.executiveSummary.trim()
        : "";

    const focusPairs = Array.isArray(parsed.focusPairs)
      ? parsed.focusPairs.filter((p: unknown) => typeof p === "string")
      : [];

    const tradeOpportunities = Array.isArray(parsed.tradeOpportunities)
      ? parsed.tradeOpportunities.filter((o: unknown) => typeof o === "string")
      : [];

    if (!executiveSummary) {
      return null;
    }

    return {
      bias,
      volatility,
      executiveSummary,
      focusPairs,
      tradeOpportunities,
      provider: "gemini-flash",
    };
  } catch (err) {
    console.warn(
      "[Gemini] AI synthesis failed or timed out, using fallback:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
