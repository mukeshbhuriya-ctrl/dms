import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"

/**
 * ProtectedRoute — guards user routes based on authentication and optional module access.
 */
function ProtectedRoute({ children, moduleKey = null }) {
  const { isLoading, isAuthenticated, hasPermission } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <p className="text-sm text-slate-500 p-4">Checking session...</p>
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  // If a specific module key is required for this route, verify it.
  if (moduleKey && !hasPermission(moduleKey)) {
    return <Navigate to="/user/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
