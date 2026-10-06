import { createContext, useContext, useEffect, useState, useCallback } from "react"
import apiClient from "@/api/api.client"
import { validateAccess } from "@/config/permissions"

const AuthContext = createContext(null)

// ─── Normalize a role string to its canonical form ───────────────
function normalizeRole(role) {
    if (!role || typeof role !== "string") return null
    const trimmed = role.trim()
    if (!trimmed) return null
    return trimmed.toUpperCase()
}

// ─── Auth Provider ───────────────────────────────────────────────
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    const fetchAuth = useCallback(async () => {
        try {
            // apiClient handles cookies (credentials: "include") + Bearer token automatically
            const data = await apiClient.get("/api/users/auth/me", {}, { skipAuthRedirect: true })

            // Response: { success, user: { role: ["DCC"] }, role: ["DCC"], name: "dcc" }
            const rawRoles = data?.role || data?.user?.role || []
            const roles = rawRoles
                .map(normalizeRole)
                .filter(Boolean)

            if (roles.length === 0) roles.push("USER")

            setUser({
                id: data?.id || data?.user?.id || "",
                name: data?.name || data?.user?.name || "User",
                roles,
                permissions: data?.permissions || data?.user?.permissions || [],
                iamPolicies: data?.iamPolicies || data?.user?.iamPolicies || [],
                functional_tags: data?.user?.functional_tags || [],
                company: data?.company || data?.user?.company || null,
                is_hod: data?.is_hod || data?.user?.is_hod || false,
            })
            setIsAuthenticated(true)
        } catch {
            // Not authenticated or API error — stay unauthenticated
            setUser(null)
            setIsAuthenticated(false)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAuth()
    }, [fetchAuth])

    const logout = useCallback(async () => {
        try {
            await apiClient.post("/api/users/auth/logout")
        } catch (error) {
            console.error("Logout API failed:", error)
        } finally {
            localStorage.removeItem("user_auth")
            setUser(null)
            setIsAuthenticated(false)
        }
    }, [])

    const hasPermission = (moduleKey, action = 'View') => {
        const policies = user?.iamPolicies || [];
        return validateAccess(policies, moduleKey, action) || validateAccess(policies, 'ALL', action);
    }

    const value = {
        user,
        roles: user?.roles || [],
        permissions: user?.permissions || [],
        iamPolicies: user?.iamPolicies || [],
        functionalTags: user?.functional_tags || [],
        userName: user?.name || "User",
        companyName: user?.company?.name || "Tech Fab",
        companyLogo: user?.company?.logo_url || null,
        isLoading,
        isAuthenticated,
        logout,
        hasPermission,
        refetch: fetchAuth,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

// ─── Hook ────────────────────────────────────────────────────────
export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}

export default AuthContext
