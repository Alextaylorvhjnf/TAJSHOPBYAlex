import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * v26fix (task 5): clicking ANYWHERE on a date/datetime-local input opens the
 * browser picker — not only the tiny calendar icon. The native input element
 * gets a synthesized click handler; showPicker() is guarded (older browsers
 * throw / lack support → fall back to focusing). Applied centrally so every
 * admin form field (discount deadline, slider/story/coupon dates, template
 * timers…) benefits without touching each call site.
 */
function Input({ className, type, onClick, ...props }: React.ComponentProps<"input">) {
  const isDateInput = type === "datetime-local" || type === "date" || type === "time"
  const handleClick: React.MouseEventHandler<HTMLInputElement> = (e) => {
    onClick?.(e)
    if (isDateInput && e.currentTarget instanceof HTMLInputElement) {
      try {
        e.currentTarget.showPicker()
      } catch {
        // unsupported browser (or already-open picker) → keep default behavior
        e.currentTarget.focus()
      }
    }
  }
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        isDateInput && "cursor-text",
        className
      )}
      onClick={isDateInput ? handleClick : onClick}
      {...props}
    />
  )
}

export { Input }
