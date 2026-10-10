"use client";

import { useState, useTransition } from "react";
import { Sparkles, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { SessionType } from "@/types/report";
import { generateSessionReport } from "@/app/actions/reportActions";
import { Button } from "@/components/ui/button";

const SESSIONS: { type: SessionType; label: string; desc: string }[] = [
  {
    type: "LONDON_OPEN",
    label: "London Open",
    desc: "3:00 PM PHT — Focus on EUR, GBP liquidity sweeps and morning range expansion.",
  },
  {
    type: "NEW_YORK_OPEN",
    label: "New York Open",
    desc: "8:00 PM PHT — Focus on USD catalysts, London overlap, and US equity market opens.",
  },
  {
    type: "ASIAN_WRAP",
    label: "Asian Wrap",
    desc: "7:00 AM PHT — Asian range consolidation, Tokyo fix, and day structure setup.",
  },
];

export function GenerateReportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionType>("LONDON_OPEN");
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleGenerate = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const result = await generateSessionReport(selectedSession);
      if (result.success) {
        setStatusMessage({ type: "success", text: "Session report synthesized and published successfully!" });
        setTimeout(() => {
          setIsOpen(false);
          setStatusMessage(null);
        }, 1200);
      } else {
        setStatusMessage({ type: "error", text: result.error ?? "Failed to generate session report." });
      }
    });
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="h-9 gap-1.5 text-xs font-semibold">
        <Sparkles className="h-4 w-4" />
        Generate Report
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Session Intelligence Engine
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Synthesize live quotes, economic calendars, and open setups into an executive brief.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Session Selector */}
            <div className="mt-4 space-y-3">
              <label className="text-xs font-semibold text-foreground">
                Select Target Trading Session:
              </label>
              <div className="grid gap-2">
                {SESSIONS.map((s) => {
                  const isSelected = selectedSession === s.type;
                  return (
                    <div
                      key={s.type}
                      onClick={() => setSelectedSession(s.type)}
                      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground">{s.label}</span>
                        {isSelected && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed">{s.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Alert */}
            {statusMessage && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-xs ${
                  statusMessage.type === "success"
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Footer Actions */}
            <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={isPending}
                className="gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Synthesizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Synthesize & Publish
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
