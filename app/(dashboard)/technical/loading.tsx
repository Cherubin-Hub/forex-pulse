import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TechnicalLoading() {
  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="space-y-1">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-4 h-[420px] flex items-center justify-center">
          <Skeleton className="h-6 w-48" />
        </Card>
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-28 w-full" />
          </Card>
          <Card className="p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-28 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}
