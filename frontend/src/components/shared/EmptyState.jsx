import { Inbox } from "lucide-react"

/**
 * EmptyState
 * Standardized empty state component for when no data is available.
 * 
 * Usage:
 * <EmptyState
 *   icon={FileText}
 *   title="No reports found"
 *   description="Create your first report to get started."
 *   action={<Button onClick={handleCreate}>Create Report</Button>}
 * />
 */
export function EmptyState({
  icon: Icon = Inbox,
  title = "No data available",
  description = "There are no records to display.",
  action,
  className = "",
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 mb-4">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 text-center max-w-xs mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
