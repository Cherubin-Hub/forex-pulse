"use client";

import { useEffect } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000";
  const targetLaunchUrl = `${gatewayUrl}/login?app=forex-pulse`;

  useEffect(() => {
    // Automatically redirect after a short delay
    const timer = setTimeout(() => {
      window.location.href = targetLaunchUrl;
    }, 1200);

    return () => clearTimeout(timer);
  }, [targetLaunchUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 text-card-foreground shadow-2xl text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Institutional Gateway Required</h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Forex Pulse is strictly gated behind Pulse Gateway. Single Sign-On and risk controls are managed centrally.
          </p>
        </div>
        <div>
          <Button
            onClick={() => {
              window.location.href = targetLaunchUrl;
            }}
            className="w-full font-bold uppercase tracking-wider text-xs py-5 bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            Authenticate via Pulse Gateway <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-[11px] text-muted-foreground mt-3 animate-pulse">
            Redirecting to Pulse Gateway...
          </p>
        </div>
      </div>
    </div>
  );
}
