import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"

/**
 * ProtectedRoute — guards routes based on authentication and role access.
 *
 * For normal user routes:
 *   Uses AuthContext (centralized, no extra API calls).
 *   - allowedRoles: optional array of role strings that can access this route.
 *
 * For siteadmin routes:
 *   Set authKey="siteadmin_auth" + apiEndpoint="/api/siteadmin/auth/me"
 *   Falls back to standalone auth check (separate from AuthContext).
 */
function ProtectedRoute({
  children,
  loginPath = "/",
  allowedRoles = null,
  moduleKey = null, // New prop for module access
  // Siteadmin-specific props (standalone auth)
  authKey = null,
  apiEndpoint = null,
}) {
  // If custom authKey is specified, use standalone auth (for siteadmin)
  if (authKey) {
    return (
      <StandaloneProtectedRoute
        authKey={authKey}
        apiEndpoint={apiEndpoint || "/api/siteadmin/auth/me"}
        loginPath={loginPath}
      >
        {children}
      </StandaloneProtectedRoute>
    )
  }

  // Otherwise use centralized AuthContext
  return (
    <AuthContextProtectedRoute
      loginPath={loginPath}
      allowedRoles={allowedRoles}
      moduleKey={moduleKey}
    >
      {children}
    </AuthContextProtectedRoute>
  )
}

// ─── AuthContext-based protection (for normal users) ───────────
function AuthContextProtectedRoute({ children, loginPath, allowedRoles, moduleKey }) {
  const { isLoading, isAuthenticated, roles, hasPermission } = useAuth()

  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace />
  }

  // Check specific module permission if provided (Priority)
  if (moduleKey) {
    if (!hasPermission(moduleKey)) {
      return <Navigate to={loginPath} replace />
    }
    return children
  }

  // Check specific allowed roles if provided (Legacy/Fallback)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoleSet = new Set(roles)
    const hasRole = allowedRoles.some((r) => userRoleSet.has(r))
    if (!hasRole) {
      return <Navigate to={loginPath} replace />
    }
  }

  return children
}

// ─── Standalone protection (for siteadmin) ─────────────────────
function StandaloneProtectedRoute({ children, authKey, apiEndpoint, loginPath }) {
  const [status, setStatus] = useState("checking")

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()

    const checkAuth = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
        const authData = localStorage.getItem(authKey)

        if (!authData) {
          if (isActive) setStatus("unauth")
          return
        }

        let token = null
        try {
          const parsed = JSON.parse(authData)
          token = parsed?.payload?.token || parsed?.token
        } catch {
          if (isActive) setStatus("unauth")
          return
        }

        const headers = {}
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch(`${backendUrl}${apiEndpoint}`, {
          method: "GET",
          headers,
          credentials: "include",
          signal: controller.signal,
        })

        if (!res.ok) {
          if (isActive) setStatus("unauth")
          return
        }

        const contentType = res.headers.get("content-type") || ""
        if (!contentType.includes("application/json")) {
          if (isActive) setStatus("unauth")
          return
        }

        if (isActive) setStatus("authed")
      } catch (err) {
        if (err?.name === "AbortError") return
        if (isActive) setStatus("unauth")
      }
    }

    checkAuth()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [authKey, apiEndpoint, loginPath])

  if (status === "checking") return null
  if (status === "unauth") return <Navigate to={loginPath} replace />
  return children
}

export default ProtectedRoute
