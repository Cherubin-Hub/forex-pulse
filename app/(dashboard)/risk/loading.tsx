import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RiskLoading() {
  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in-0 duration-300">
      <div className="space-y-1">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 space-y-4">
          <Skeleton className="h-5 w-36" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </Card>

        <Card className="p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </Card>
      </div>
    </div>
  );
}
