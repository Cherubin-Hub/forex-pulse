import { CardSkeleton } from "@/components/shared/CardSkeleton";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GoldLoading() {
  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in-0 duration-300">
      <div className="space-y-1">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} variant="metric" />
        ))}
      </div>

      <Card className="p-4 h-[450px] flex items-center justify-center">
        <div className="space-y-2 text-center">
          <Skeleton className="h-8 w-8 rounded-full mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </Card>
    </div>
  );
}
