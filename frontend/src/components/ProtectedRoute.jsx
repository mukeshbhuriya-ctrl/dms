import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"

function ProtectedRoute({
  children,
  authKey = "siteadmin_auth",
  requiredRole = null,
  loginPath = "/siteadmin/login",
  apiEndpoint = "/api/siteadmin/auth/me",
}) {
  const [status, setStatus] = useState("checking")

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()

    const normalizeRole = (role) =>
      typeof role === "string" ? role.trim().toLowerCase() : ""

    const hasRequiredRole = (payload) => {
      if (!requiredRole) {
        return true
      }

      const candidates = []
      
      // Check for role field (can be array or string)
      if (Array.isArray(payload?.role)) {
        candidates.push(...payload.role)
      } else if (typeof payload?.role === "string") {
        candidates.push(payload.role)
      }
      
      // Check for roles field (array)
      if (Array.isArray(payload?.roles)) {
        candidates.push(...payload.roles)
      }
      
      // Check nested locations
      const role =
        payload?.user?.role ||
        payload?.payload?.role ||
        payload?.data?.role
      if (role) {
        if (Array.isArray(role)) {
          candidates.push(...role)
        } else {
          candidates.push(role)
        }
      }

      const roles =
        payload?.user?.roles ||
        payload?.payload?.roles ||
        payload?.data?.roles
      if (Array.isArray(roles)) {
        candidates.push(...roles)
      }

      const normalizedRequired = normalizeRole(requiredRole)
      return candidates.some(
        (candidate) => normalizeRole(candidate) === normalizedRequired,
      )
    }

    const checkAuth = async () => {
      try {
        const backendUrl =
          import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
        const authData = localStorage.getItem(authKey)
        if (!authData) {
          if (isActive) {
            setStatus("unauth")
          }
          return
        }
        let token = null

        if (authData) {
          try {
            const parsed = JSON.parse(authData)
            token = parsed?.payload?.token || parsed?.token
          } catch {
            if (isActive) {
              setStatus("unauth")
            }
            return
          }
        }

        const headers = {}
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }

        const res = await fetch(`${backendUrl}${apiEndpoint}`, {
          method: "GET",
          headers,
          credentials: "include",
          signal: controller.signal,
        })

        if (!res.ok) {
          if (isActive) {
            setStatus("unauth")
          }
          return
        }

        const contentType = res.headers.get("content-type") || ""
        if (!contentType.includes("application/json")) {
          if (isActive) {
            setStatus("unauth")
          }
          return
        }

        const payload = await res.json()
        
        // Only check role if requiredRole is specified
        if (requiredRole && !hasRequiredRole(payload)) {
          if (isActive) {
            setStatus("unauth")
          }
          return
        }

        if (isActive) {
          setStatus("authed")
        }
      } catch (err) {
        if (err?.name === "AbortError") {
          return
        }
        if (isActive) {
          setStatus("unauth")
        }
      }
    }

    checkAuth()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [authKey, requiredRole, apiEndpoint, loginPath])

  if (status === "checking") {
    return null
  }

  if (status === "unauth") {
    return <Navigate to={loginPath} replace />
  }

  return children
}

export default ProtectedRoute
