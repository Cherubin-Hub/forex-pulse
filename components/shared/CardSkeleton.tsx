import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CardSkeletonProps {
  variant?: "currency" | "setup" | "metric";
}

export function CardSkeleton({ variant = "currency" }: CardSkeletonProps) {
  if (variant === "metric") {
    return (
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3.5 w-3.5 rounded-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </Card>
    );
  }

  if (variant === "setup") {
    return (
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-14 rounded-md" />
          </div>
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3">
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-1 border-l border-border pl-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-1 border-l border-border pl-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        <Skeleton className="h-8 w-full rounded-lg" />

        <div className="flex items-center justify-between border-t border-border pt-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      </Card>
    );
  }

  // Default: Currency Card Skeleton
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>

      <div className="space-y-1">
        <div className="flex items-end justify-between">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>

      <Skeleton className="h-10 w-full rounded-md" />

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-1 text-right flex flex-col items-end">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
    </Card>
  );
}
