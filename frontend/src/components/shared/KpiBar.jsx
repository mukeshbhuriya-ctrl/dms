/**
 * KpiBar
 * Horizontal metric summary strip — sits above data tables.
 * Shows 3-5 KPI pills with label + value.
 * 
 * Usage:
 * <KpiBar items={[
 *   { label: "Total Reports", value: 124 },
 *   { label: "Active", value: 112, variant: "success" },
 *   { label: "Pending", value: 8, variant: "warning" },
 *   { label: "Expiring", value: 3, variant: "destructive" },
 * ]} />
 */

const variantStyles = {
  default: "border-slate-200 bg-white",
  success: "border-emerald-200 bg-emerald-50/50",
  warning: "border-amber-200 bg-amber-50/50",
  destructive: "border-red-200 bg-red-50/50",
  info: "border-blue-200 bg-blue-50/50",
}

const valueStyles = {
  default: "text-slate-900",
  success: "text-emerald-700",
  warning: "text-amber-700",
  destructive: "text-red-700",
  info: "text-blue-700",
}

export function KpiBar({ items = [], loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="h-3 w-16 bg-slate-100 rounded animate-pulse mb-2" />
            <div className="h-6 w-12 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (!items.length) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      {items.map((item, idx) => {
        const variant = item.variant || "default"
        return (
          <div
            key={item.label || idx}
            className={`rounded-lg border p-3 transition-colors ${variantStyles[variant]}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">
              {item.label}
            </p>
            <p className={`text-xl font-bold tracking-tight ${valueStyles[variant]}`}>
              {typeof item.value === "number"
                ? new Intl.NumberFormat("en-IN").format(item.value)
                : item.value}
            </p>
          </div>
        )
      })}
    </div>
  )
}
