/**
 * PageHeader
 * Standard page header with title, description, and action slot.
 * Used at the top of every page inside PageContainer.
 * 
 * NOTE: This replaces the need for ModuleHeader on pages.
 * The TopBar now handles sidebar trigger and notifications globally.
 * This component focuses ONLY on page-specific title and actions.
 */
export function PageHeader({ title, description, actions, children }) {
  return (
    <div className="flex flex-col gap-1 mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight outfit">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500 font-medium">
            {description}
          </p>
        )}
      </div>
      {(actions || children) && (
        <div className="flex items-center gap-2 shrink-0 mt-3 sm:mt-0">
          {actions || children}
        </div>
      )}
    </div>
  )
}
