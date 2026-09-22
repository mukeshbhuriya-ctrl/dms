import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"

/**
 * SiteAdminRoute — guards routes based on standalone siteadmin authentication.
 */
function SiteAdminRoute({ children, authKey, apiEndpoint, loginPath }) {
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

export default SiteAdminRoute
