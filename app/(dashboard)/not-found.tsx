import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button"; // 👈 1. IMPORT buttonVariants
import { Card, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils"; // 👈 2. IMPORT cn

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="glass max-w-md w-full shadow-sm text-center p-6 space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Compass className="h-6 w-6" />
        </div>

        <div className="space-y-1">
          <CardTitle className="text-xl font-bold">404 — Module Not Found</CardTitle>
          <CardDescription>
            The requested instrument, setup record, or terminal page does not exist or has been archived.
          </CardDescription>
        </div>

        <CardContent className="pt-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/dashboard"
              className="flex items-center justify-between rounded-lg border border-border p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <span>Dashboard</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/setups"
              className="flex items-center justify-between rounded-lg border border-border p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <span>Setups Hub</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/markets"
              className="flex items-center justify-between rounded-lg border border-border p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <span>Markets Matrix</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/calendar"
              className="flex items-center justify-between rounded-lg border border-border p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <span>Economic Radar</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardContent>

        {/* 👇 REPLACED: Styled Link instead of Button asChild */}
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "default", size: "sm" }), "w-full justify-center")}
        >
          Return to Main Console
        </Link>
      </Card>
    </div>
  );
}
