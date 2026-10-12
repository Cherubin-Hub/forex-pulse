import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors select-none [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border border-transparent bg-primary text-primary-foreground",
        secondary: "border border-border bg-secondary text-secondary-foreground",
        destructive: "border border-destructive/20 bg-destructive/10 text-destructive",
        outline: "border border-border text-foreground",
        // Financial & Institutional Trading Variants
        success: "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        warning: "border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        info: "border border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
        neutral: "border border-muted bg-muted/60 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
