import { CardSkeleton } from "@/components/shared/CardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 w-full animate-in fade-in-0 duration-300">
      {/* 1. Executive Briefing Bar Skeleton */}
      <Card className="p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>
      </Card>

      {/* 2. Global Market Session Bar Skeleton */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </Card>

      {/* 3. Market Movers Strip Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} variant="metric" />
        ))}
      </div>

      {/* 4. Active Setups Section Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} variant="setup" />
          ))}
        </div>
      </div>

      {/* 5. Watchlist Overview Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} variant="currency" />
            ))}
          </div>
        </div>

        {/* Right Column Skeletons */}
        <div className="space-y-6">
          <Card className="p-5 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-16 w-full" />
          </Card>
          <Card className="p-5 space-y-3">
            <Skeleton className="h-4 w-36" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
