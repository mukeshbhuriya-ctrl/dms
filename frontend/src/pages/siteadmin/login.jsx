import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Mail, Lock, Info, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import "../../login.css"

function SiteAdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const res = await fetch(`${backendUrl}/api/siteadmin/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      const contentType = res.headers.get("content-type") || ""
      const payload = contentType.includes("application/json")
        ? await res.json()
        : await res.text()

      if (!res.ok) {
        const message =
          typeof payload === "string"
            ? payload
            : payload?.message || "Login failed"
        throw new Error(message)
      }

      localStorage.setItem(
        "siteadmin_auth",
        JSON.stringify({ payload, loggedInAt: Date.now() }),
      )

      navigate("/siteadmin/dashboard")
    } catch (err) {
      setError(err?.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-portal-container">
      {/* Dynamic Industrial Background */}
      <div className="login-background" />
      <div className="login-overlay" />

      <div className="login-card-container">
        <div className="glass-card">
          <div className="login-header-section flex flex-col items-center">
            <img 
              src="/shreno_logo.png?v=5" 
              alt="Shreno Engineering" 
              className="h-14 w-auto object-contain mb-3" 
            />
            <h1 className="text-[18px] font-bold text-slate-600 tracking-wide uppercase">Admin Panel</h1>
          </div>

          <div className="login-form-content">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="input-wrapper">
                <Mail className="input-icon h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Admin Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="modern-input"
                  autoComplete="email"
                />
              </div>

              {/* Password Field */}
              <div className="input-wrapper">
                <Lock className="input-icon h-4 w-4" />
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Admin Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="modern-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-100 rounded text-[11px] text-red-600 font-bold">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Primary Action */}
              <Button
                type="submit"
                disabled={isLoading}
                className="primary-submit-btn"
              >
                {isLoading ? "Authenticating..." : "Admin Access"}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </Button>

              <button 
                type="button" 
                onClick={() => navigate("/")} 
                className="w-full text-[11px] text-slate-500 flex items-center justify-center cursor-pointer gap-2 mt-4 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Back to Company Portal
              </button>
            </form>
          </div>
        </div>

        {/* Global Footer */}
        <footer className="system-footer">
          <p>© {new Date().getFullYear()} SHRENO ENGINEERING LIMITED</p>
        </footer>
      </div>
    </div>
  );
}

export default SiteAdminLogin
