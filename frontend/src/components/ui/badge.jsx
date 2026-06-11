import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-none border-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest transition-colors focus:outline-none focus:ring-0",
  {
    variants: {
      variant: {
        default:
          "border-foreground bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "border-foreground bg-secondary text-secondary-foreground hover:bg-secondary/90",
        destructive:
          "border-foreground bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-foreground text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
