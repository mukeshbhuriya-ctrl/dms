/**
 * PageContainer
 * Standard content wrapper for all pages.
 * Provides consistent background, padding, max-width, and scroll behavior.
 */
export function PageContainer({ children, className = "" }) {
  return (
    <main className={`h-[calc(100vh-3.5rem)] min-h-0 overflow-y-auto w-full bg-slate-50/60 flex flex-col ${className}`}>
      <div className="w-full p-4 md:p-6 flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </main>
  )
}
