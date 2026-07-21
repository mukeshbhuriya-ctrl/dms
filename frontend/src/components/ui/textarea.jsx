import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({
  className,
  ...props
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-slate-200 placeholder:text-muted-foreground focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-[100px] w-full rounded-md border bg-white px-3 py-2 text-sm shadow-none transition-all outline-none disabled:cursor-not-allowed disabled:bg-slate-50/50 disabled:opacity-50 resize-y",
        className
      )}
      {...props} />
  );
}

export { Textarea }
