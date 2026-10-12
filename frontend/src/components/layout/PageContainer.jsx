import { cn } from "@/lib/utils"

/**
 * PageContainer
 * Standard content wrapper for all pages.
 * By default provides strict flexbox height containment (overflow-hidden)
 * to keep data tables and fixed dashboards strictly within the viewport.
 * Set `scrollable={true}` for long multi-card forms or documents that require page scrolling.
 */
export function PageContainer({ children, className = "", scrollable = false, containerClassName = "" }) {
  return (
    <main
      className={cn(
        "flex-1 min-h-0 h-full w-full bg-slate-50/60 flex flex-col",
        scrollable ? "overflow-y-auto" : "overflow-hidden",
        className
      )}
    >
      <div
        className={cn(
          "w-full p-4 md:p-6 flex-1 flex flex-col",
          scrollable ? "min-h-full h-auto" : "min-h-0 h-full overflow-hidden",
          containerClassName
        )}
      >
        {children}
      </div>
    </main>
  )
}

export default PageContainer

