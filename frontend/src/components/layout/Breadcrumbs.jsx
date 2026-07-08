import { useLocation, Link } from "react-router-dom"
import { ChevronRight, Home } from "lucide-react"
import { resolveBreadcrumbs } from "@/config/navigation"

/**
 * Dynamic Breadcrumbs
 * Auto-generates a breadcrumb trail from the current route using the navigation config.
 * Placed inside the TopBar for persistent spatial awareness.
 */
export function Breadcrumbs() {
  const { pathname } = useLocation()
  const crumbs = resolveBreadcrumbs(pathname)

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs">
      <Link
        to="/admin/dashboard"
        className="flex items-center text-slate-400 hover:text-slate-600 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1
        return (
          <span key={`${crumb.label}-${idx}`} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-slate-300" />
            {isLast || !crumb.path ? (
              <span className={`font-medium ${isLast ? "text-slate-800" : "text-slate-400"}`}>
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
