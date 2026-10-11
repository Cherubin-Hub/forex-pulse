"use client";

import { useState } from "react";
import { ShieldAlert, Lock, HeartPulse, X } from "lucide-react";
import { engageManualTiltLockout } from "@/lib/circuitBreakerUtils";

interface TiltEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEngaged: () => void;
}

export function TiltEmergencyModal({
  isOpen,
  onClose,
  onEngaged,
}: TiltEmergencyModalProps) {
  const [selectedHours, setSelectedHours] = useState(4);
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleEngageLockout = () => {
    engageManualTiltLockout(selectedHours);
    onEngaged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-xl border border-rose-500/30 bg-card p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Digital Disciplinarian • Tilt Emergency Lockout
              </h3>
              <p className="text-xs text-muted-foreground">
                Voluntary Self-Imposed Terminal Lockout
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mindset Prompt */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1.5 text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-1.5 font-bold">
            <HeartPulse className="h-4 w-4" />
            <span>Preserve Capital. Step Away from the Charts.</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            If you feel frustration, revenge impulses, or emotional tilt after a stop-out, the highest edge action you can take right now is to stop trading and allow dopamine levels to reset.
          </p>
        </div>

        {/* Lockout Duration Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Lockout Duration
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { hours: 2, label: "2 Hours", desc: "Cool Down" },
              { hours: 4, label: "4 Hours", desc: "Rest of Session" },
              { hours: 12, label: "12 Hours", desc: "Until Tomorrow" },
            ].map((opt) => (
              <button
                key={opt.hours}
                type="button"
                onClick={() => setSelectedHours(opt.hours)}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  selectedHours === opt.hours
                    ? "border-rose-500 bg-rose-500/10 text-foreground font-bold shadow-sm"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <div className="font-mono text-sm">{opt.label}</div>
                <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded border-border"
          />
          <span className="leading-tight text-muted-foreground">
            I confirm that I am stepping away to protect my account equity and mental capital.
          </span>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!confirmed}
            onClick={handleEngageLockout}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
              confirmed
                ? "bg-rose-500 text-white hover:bg-rose-600 shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Engage Emergency Lockout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
