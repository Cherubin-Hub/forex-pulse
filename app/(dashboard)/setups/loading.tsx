import { CardSkeleton } from "@/components/shared/CardSkeleton";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SetupsLoading() {
  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="space-y-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      <Card className="p-4 space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-full rounded-md" />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} variant="setup" />
        ))}
      </div>
    </div>
  );
}
