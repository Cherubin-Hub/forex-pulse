import { cn } from "cn"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-muted/70 animate-pulse",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
