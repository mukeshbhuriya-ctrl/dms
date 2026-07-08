/**
 * PageContainer
 * Standard content wrapper for all pages.
 * Provides consistent background, padding, max-width, and scroll behavior.
 */
export function PageContainer({ children, className = "" }) {
  return (
    <main className={`flex-1 overflow-y-auto bg-slate-50/60 ${className}`}>
      <div className="mx-auto max-w-[1600px] p-6">
        {children}
      </div>
    </main>
  )
}
