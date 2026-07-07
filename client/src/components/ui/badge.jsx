import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary ring-primary/20",
        secondary:
          "bg-secondary text-secondary-foreground ring-secondary/30",
        destructive:
          "bg-destructive/10 text-destructive ring-destructive/20",
        outline:
          "bg-transparent text-foreground ring-border",
        warning:
          "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
        info:
          "bg-blue-50 text-blue-700 ring-blue-700/20",
        indigo:
          "bg-indigo-50 text-indigo-700 ring-indigo-700/20",
        success:
          "bg-green-50 text-green-700 ring-green-600/20",
        muted:
          "bg-gray-50 text-gray-600 ring-gray-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
