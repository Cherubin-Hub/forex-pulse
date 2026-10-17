"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button"; // 👈 1. IMPORT buttonVariants
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils"; // 👈 2. IMPORT cn

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError Boundary Caught]:", error);
  }, [error]);

  return (
    <div className="flex min-h-[65vh] items-center justify-center p-4">
      <Card className="glass max-w-md w-full shadow-lg border-destructive/30">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-3">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg font-bold">Trading Console Exception</CardTitle>
          <CardDescription>
            An unexpected error interrupted data rendering. Risk controls and trade positions remain safe.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 text-center">
          <div className="rounded-lg bg-muted/50 p-3 text-left">
            <p className="text-[11px] font-mono text-muted-foreground break-all">
              {error.message || "Unknown client/server rendering exception."}
            </p>
            {error.digest && (
              <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                Digest: {error.digest}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between gap-3 pt-2">
          {/* 👇 REPLACED: Styled Link instead of Button asChild */}
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <Home className="h-3.5 w-3.5" />
            Overview
          </Link>

          <Button size="sm" onClick={() => reset()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Reload Module
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
