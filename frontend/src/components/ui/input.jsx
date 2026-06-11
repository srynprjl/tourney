import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-none border-2 border-foreground bg-background px-4 py-2 text-sm font-bold uppercase tracking-tight ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-black placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
